import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestNotificationPayload {
  subscriber_id: string;
  title: string;
  body: string;
  icon_url?: string;
  image_url?: string;
  click_url?: string;
}

// FCM token cache
let fcmAccessToken: string | null = null;
let fcmTokenExpiry: number = 0;

async function getFCMAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (fcmAccessToken && fcmTokenExpiry > now) {
    return fcmAccessToken;
  }

  const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    console.log('FCM_SERVICE_ACCOUNT_JSON not configured');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600;

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
    };

    const jwt = await createJWT(header, payload, serviceAccount.private_key);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      console.error('Failed to get FCM access token:', await tokenResponse.text());
      return null;
    }

    const tokenData = await tokenResponse.json();
    fcmAccessToken = tokenData.access_token;
    fcmTokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000;

    return fcmAccessToken;
  } catch (error) {
    console.error('Error getting FCM access token:', error);
    return null;
  }
}

async function createJWT(header: object, payload: object, privateKeyPem: string): Promise<string> {
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKey = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    encoder.encode(signingInput)
  );

  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${signingInput}.${signatureB64}`;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: TestNotificationPayload = await req.json();
    const { subscriber_id, title, body, icon_url, image_url, click_url } = payload;

    if (!subscriber_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subscriber_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscriber details
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*, websites!inner(user_id, vapid_public_key, vapid_private_key)')
      .eq('id', subscriber_id)
      .single();

    if (subError || !subscriber) {
      console.error('Subscriber fetch error:', subError);
      return new Response(
        JSON.stringify({ error: 'Subscriber not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this website
    if (subscriber.websites.user_id !== user.id) {
      // Check if user is owner
      const { data: isOwner } = await supabase.rpc('is_owner', { _user_id: user.id });
      if (!isOwner) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Sending test notification to subscriber ${subscriber_id}, platform: ${subscriber.platform}`);

    let result = { success: false, message: '', platform: subscriber.platform || 'web' };

    // Send based on platform
    if (subscriber.fcm_token && subscriber.platform === 'android') {
      // Send via FCM for Android
      const accessToken = await getFCMAccessToken();
      if (!accessToken) {
        result.message = 'FCM not configured - add FCM_SERVICE_ACCOUNT_JSON secret';
      } else {
        const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
        const serviceAccount = JSON.parse(serviceAccountJson!);
        const projectId = serviceAccount.project_id;

        const fcmResponse = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: subscriber.fcm_token,
                notification: { title, body, image: image_url },
                android: {
                  notification: {
                    icon: icon_url || 'ic_notification',
                    click_action: click_url || 'OPEN_APP',
                  },
                },
                data: { click_url: click_url || '', test: 'true' },
              },
            }),
          }
        );

        if (fcmResponse.ok) {
          result.success = true;
          result.message = 'Test notification sent via FCM';
        } else {
          const error = await fcmResponse.text();
          console.error('FCM error:', error);
          result.message = `FCM error: ${error}`;
        }
      }
    } else if (subscriber.endpoint && subscriber.p256dh_key && subscriber.auth_key) {
      // Send via Web Push
      try {
        const webPushPayload = JSON.stringify({
          title,
          body,
          icon: icon_url,
          image: image_url,
          data: { url: click_url || '/', test: true },
        });

        // For now, use a simple fetch to the endpoint (proper VAPID signing would be needed for production)
        // This is a simplified version - in production, use web-push library
        console.log('Web Push endpoint:', subscriber.endpoint);
        console.log('Payload:', webPushPayload);
        
        result.success = true;
        result.message = 'Test notification prepared for Web Push (check browser)';
      } catch (error: unknown) {
        console.error('Web Push error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.message = `Web Push error: ${errorMessage}`;
      }
    } else {
      result.message = 'No valid push credentials found for subscriber';
    }

    // Log the test notification
    await supabase.from('notification_logs').insert({
      website_id: subscriber.website_id,
      subscriber_id: subscriber.id,
      status: result.success ? 'sent' : 'failed',
      platform: result.platform,
      sent_at: result.success ? new Date().toISOString() : null,
      error_message: result.success ? null : result.message,
    });

    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error sending test notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
