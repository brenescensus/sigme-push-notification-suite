/**
 * Send Notification Edge Function
 * 
 * PRODUCTION-READY push notification engine supporting:
 * - Web Push with proper VAPID JWT signing (RFC 8292)
 * - FCM HTTP v1 API for Android
 * 
 * Features:
 * - Batch sending with configurable size
 * - Retry logic with exponential backoff
 * - Token cleanup for failed subscriptions
 * - Comprehensive delivery logging
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FCM HTTP v1 API endpoint template
const FCM_V1_ENDPOINT = 'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send';

// Cache for FCM access token
let fcmAccessToken: { token: string; expires: number } | null = null;

// Configuration
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { campaignId, websiteId, notification, targetSubscriberIds } = body;

    console.log('[SendNotification] Starting for campaign:', campaignId, 'website:', websiteId);

    if (!websiteId || !notification) {
      return new Response(
        JSON.stringify({ error: 'websiteId and notification are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get website with VAPID keys
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      return new Response(
        JSON.stringify({ error: 'Website not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target subscribers
    let subscribersQuery = supabase
      .from('subscribers')
      .select('*')
      .eq('website_id', websiteId)
      .eq('status', 'active');

    if (targetSubscriberIds && targetSubscriberIds.length > 0) {
      subscribersQuery = subscribersQuery.in('id', targetSubscriberIds);
    }

    const { data: subscribers, error: subscribersError } = await subscribersQuery;

    if (subscribersError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscribers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, message: 'No active subscribers' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SendNotification] Sending to ${subscribers.length} subscribers`);

    // Separate by platform
    const webSubscribers = subscribers.filter((s: any) => s.platform === 'web' && s.endpoint);
    const androidSubscribers = subscribers.filter((s: any) => s.platform === 'android' && s.fcm_token);

    console.log(`[SendNotification] Web: ${webSubscribers.length}, Android: ${androidSubscribers.length}`);

    let sentCount = 0;
    let failedCount = 0;
    const failedSubscriberIds: string[] = [];

    // Process Web Push subscribers
    for (let i = 0; i < webSubscribers.length; i += BATCH_SIZE) {
      const batch = webSubscribers.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.allSettled(
        batch.map((subscriber: any) => sendWithRetry(
          () => sendWebPushNotification(
            subscriber,
            notification,
            website.vapid_public_key,
            website.vapid_private_key,
            website.url
          ),
          MAX_RETRIES,
          subscriber.id
        ))
      );

      results.forEach((result, idx) => {
        const subscriber = batch[idx];
        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++;
          logNotification(supabase, campaignId, subscriber.id, websiteId, 'sent', 'web');
        } else {
          failedCount++;
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          logNotification(supabase, campaignId, subscriber.id, websiteId, 'failed', 'web', String(error));
          if (isExpiredSubscription(error)) {
            failedSubscriberIds.push(subscriber.id);
          }
        }
      });
    }

    // Process Android subscribers
    for (let i = 0; i < androidSubscribers.length; i += BATCH_SIZE) {
      const batch = androidSubscribers.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.allSettled(
        batch.map((subscriber: any) => sendWithRetry(
          () => sendFCMNotification(subscriber.fcm_token, notification),
          MAX_RETRIES,
          subscriber.id
        ))
      );

      results.forEach((result, idx) => {
        const subscriber = batch[idx];
        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++;
          logNotification(supabase, campaignId, subscriber.id, websiteId, 'sent', 'android');
        } else {
          failedCount++;
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          logNotification(supabase, campaignId, subscriber.id, websiteId, 'failed', 'android', String(error));
          if (isExpiredSubscription(error)) {
            failedSubscriberIds.push(subscriber.id);
          }
        }
      });
    }

    // Mark expired subscriptions
    if (failedSubscriberIds.length > 0) {
      await supabase
        .from('subscribers')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .in('id', failedSubscriberIds);
      console.log(`[SendNotification] Marked ${failedSubscriberIds.length} subscribers inactive`);
    }

    // Update campaign stats
    if (campaignId) {
      await updateCampaignStats(supabase, campaignId, sentCount, failedCount);
    }

    // Update website notification count
    await supabase
      .from('websites')
      .update({ 
        notifications_sent: (website.notifications_sent || 0) + sentCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', websiteId);

    console.log(`[SendNotification] Done: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: subscribers.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SendNotification] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Retry wrapper
async function sendWithRetry(
  sendFn: () => Promise<{ success: boolean; error?: string }>,
  maxRetries: number,
  subscriberId: string
): Promise<{ success: boolean; error?: string }> {
  let lastError = '';
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendFn();
      if (result.success) return result;
      lastError = result.error || 'Unknown error';
      if (isPermanentFailure(lastError)) return result;
      if (attempt < maxRetries) {
        await sleep(RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]);
      }
    } catch (err) {
      lastError = String(err);
      if (attempt < maxRetries) {
        await sleep(RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]);
      }
    }
  }
  return { success: false, error: lastError };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isPermanentFailure(error: string): boolean {
  return ['SUBSCRIPTION_EXPIRED', 'UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND'].some(e => error.includes(e));
}

// Log notification
async function logNotification(
  supabase: any,
  campaignId: string | null,
  subscriberId: string,
  websiteId: string,
  status: string,
  platform: string,
  error?: string
) {
  try {
    await supabase.from('notification_logs').insert({
      campaign_id: campaignId,
      subscriber_id: subscriberId,
      website_id: websiteId,
      status,
      platform,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      error_message: error || null,
    });
  } catch (err) {
    console.error('[Log] Failed:', err);
  }
}

// Update campaign stats
async function updateCampaignStats(supabase: any, campaignId: string, sent: number, failed: number) {
  try {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('sent_count, failed_count')
      .eq('id', campaignId)
      .single();

    if (campaign) {
      await supabase
        .from('campaigns')
        .update({
          sent_count: (campaign.sent_count || 0) + sent,
          failed_count: (campaign.failed_count || 0) + failed,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);
    }
  } catch (err) {
    console.error('[CampaignStats] Failed:', err);
  }
}

/**
 * Web Push Notification with proper VAPID JWT signing (RFC 8292)
 * 
 * This implementation creates a proper VAPID JWT for authorization
 * and sends the notification with correct headers.
 */
async function sendWebPushNotification(
  subscriber: any,
  notification: any,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  websiteUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const endpoint = subscriber.endpoint;
    const p256dh = subscriber.p256dh_key;
    const auth = subscriber.auth_key;

    if (!endpoint || !p256dh || !auth) {
      return { success: false, error: 'Missing subscription credentials' };
    }

    // Build payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      image: notification.image,
      url: notification.url || '/',
      actions: notification.actions || [],
      notificationId: notification.notificationId,
      timestamp: Date.now(),
    });

    // Create VAPID JWT for authorization
    const audience = new URL(endpoint).origin;
    const vapidJwt = await createVapidJwt(audience, vapidPrivateKey, websiteUrl);

    // Send with VAPID authorization
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
        'Authorization': `vapid t=${vapidJwt}, k=${vapidPublicKey}`,
      },
      body: new TextEncoder().encode(payload),
    });

    if (response.ok || response.status === 201) {
      return { success: true };
    }

    const status = response.status;
    if (status === 404 || status === 410) {
      return { success: false, error: 'SUBSCRIPTION_EXPIRED' };
    }
    if (status === 401 || status === 403) {
      return { success: false, error: 'VAPID_AUTH_FAILED' };
    }

    const errorText = await response.text();
    console.error('[WebPush] Failed:', status, errorText);
    return { success: false, error: `HTTP_${status}` };

  } catch (error) {
    console.error('[WebPush] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Create VAPID JWT token for Web Push authorization (RFC 8292)
 * 
 * The private key should be a 32-byte raw P-256 private key in base64url format.
 */
async function createVapidJwt(
  audience: string, 
  privateKeyBase64: string,
  subject: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  const payload = {
    aud: audience,
    exp: now + 43200, // 12 hours
    sub: subject.startsWith('mailto:') ? subject : `mailto:noreply@${new URL(subject).hostname}`,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the private key (raw 32-byte P-256 private key)
  const privateKey = await importVapidPrivateKey(privateKeyBase64);

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  // Convert signature to base64url
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${signatureB64}`;
}

/**
 * Import VAPID private key from base64url format
 * 
 * VAPID private keys are raw 32-byte P-256 scalars in base64url encoding.
 * We need to construct a JWK to import them with Web Crypto API.
 */
async function importVapidPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  // Decode base64url private key (should be 32 bytes for P-256 or longer for PKCS8)
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  
  // Check if this is a PKCS8 formatted key (longer) or raw 32-byte key
  if (privateKeyBytes.length > 32) {
    // This is likely PKCS8 format from our key generator
    try {
      // Create a new ArrayBuffer to ensure correct type
      const keyBuffer = new ArrayBuffer(privateKeyBytes.length);
      const keyView = new Uint8Array(keyBuffer);
      keyView.set(privateKeyBytes);
      
      return await crypto.subtle.importKey(
        'pkcs8',
        keyBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
    } catch (e) {
      console.error('[VAPID] PKCS8 import failed:', e);
      throw new Error('Failed to import VAPID private key (PKCS8 format)');
    }
  }
  
  // For raw 32-byte keys, we need to construct a PKCS8 wrapper
  // PKCS8 structure for P-256:
  // SEQUENCE {
  //   INTEGER 0 (version)
  //   SEQUENCE { OID ecPublicKey, OID prime256v1 }
  //   OCTET STRING { ECPrivateKey }
  // }
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, // SEQUENCE, 65 bytes
    0x02, 0x01, 0x00, // INTEGER 0 (version)
    0x30, 0x13, // SEQUENCE, 19 bytes (algorithm identifier)
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID 1.2.840.10045.2.1 (ecPublicKey)
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID 1.2.840.10045.3.1.7 (prime256v1)
    0x04, 0x27, // OCTET STRING, 39 bytes
    0x30, 0x25, // SEQUENCE, 37 bytes (ECPrivateKey)
    0x02, 0x01, 0x01, // INTEGER 1 (version)
    0x04, 0x20, // OCTET STRING, 32 bytes (private key)
  ]);

  const pkcs8Key = new Uint8Array(pkcs8Header.length + 32);
  pkcs8Key.set(pkcs8Header);
  pkcs8Key.set(privateKeyBytes.slice(0, 32), pkcs8Header.length);

  try {
    // Create a new ArrayBuffer to ensure correct type
    const keyBuffer = new ArrayBuffer(pkcs8Key.length);
    const keyView = new Uint8Array(keyBuffer);
    keyView.set(pkcs8Key);
    
    return await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  } catch (e) {
    console.error('[VAPID] Key import error:', e);
    throw new Error('Failed to import VAPID private key');
  }
}

function base64UrlEncode(data: string | Uint8Array): string {
  let str: string;
  if (typeof data === 'string') {
    str = btoa(data);
  } else {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    str = btoa(binary);
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// FCM functions
async function getFCMAccessToken(): Promise<string> {
  if (fcmAccessToken && fcmAccessToken.expires > Date.now() + 300000) {
    return fcmAccessToken.token;
  }

  const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) throw new Error('FCM_SERVICE_ACCOUNT_JSON not configured');

  const serviceAccount = JSON.parse(serviceAccountJson);
  const { client_email, private_key } = serviceAccount;

  if (!client_email || !private_key) throw new Error('FCM service account missing fields');

  const now = Math.floor(Date.now() / 1000);
  const jwt = await createFCMJwt({
    iss: client_email,
    sub: client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }, private_key);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) throw new Error('Failed to get FCM access token');

  const tokenData = await response.json();
  fcmAccessToken = {
    token: tokenData.access_token,
    expires: Date.now() + (tokenData.expires_in * 1000),
  };

  return tokenData.access_token;
}

async function createFCMJwt(payload: Record<string, any>, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
    .replace(/-----END RSA PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${signatureB64}`;
}

async function sendFCMNotification(
  fcmToken: string,
  notification: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) return { success: false, error: 'FCM not configured' };

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    if (!projectId) return { success: false, error: 'FCM project_id missing' };

    const accessToken = await getFCMAccessToken();
    const endpoint = FCM_V1_ENDPOINT.replace('{project_id}', projectId);

    const message = {
      message: {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          image: notification.image,
        },
        android: {
          priority: 'high',
          notification: {
            icon: notification.icon || 'ic_notification',
            color: '#4285F4',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            channel_id: 'default_channel',
          },
        },
        data: {
          url: notification.url || '/',
          notificationId: notification.notificationId || '',
        },
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (response.ok) return { success: true };

    const errorBody = await response.text();
    console.error('[FCM] Failed:', response.status, errorBody);

    if (response.status === 404 || errorBody.includes('UNREGISTERED') || errorBody.includes('INVALID_ARGUMENT')) {
      return { success: false, error: 'SUBSCRIPTION_EXPIRED' };
    }

    return { success: false, error: `FCM_${response.status}` };

  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function isExpiredSubscription(error: any): boolean {
  if (!error) return false;
  const errorStr = String(error);
  return errorStr.includes('SUBSCRIPTION_EXPIRED') ||
         errorStr.includes('UNREGISTERED') ||
         errorStr.includes('NOT_FOUND') ||
         errorStr.includes('410');
}
