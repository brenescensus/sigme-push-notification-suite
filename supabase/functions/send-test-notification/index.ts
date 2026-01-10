/**
 * Send Test Notification Edge Function v2
 * 
 * Sends test push notifications to individual subscribers.
 * - Proper CORS handling
 * - Health check endpoint
 * - Web Push with VAPID signing
 * - FCM for Android
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FCM token cache
let fcmAccessToken: string | null = null;
let fcmTokenExpiry = 0;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'healthy', 
        function: 'send-test-notification',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('[SendTestNotification] Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user JWT
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      console.error('[SendTestNotification] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { subscriber_id, title, body: notifBody, icon_url, image_url, click_url } = body;

    if (!subscriber_id || !title || !notifBody) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subscriber_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscriber with website VAPID keys
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*, websites!inner(user_id, vapid_public_key, vapid_private_key, url)')
      .eq('id', subscriber_id)
      .single();

    if (subError || !subscriber) {
      console.error('[SendTestNotification] Subscriber not found:', subError);
      return new Response(
        JSON.stringify({ error: 'Subscriber not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this website
    if (subscriber.websites.user_id !== user.id) {
      const { data: isOwner } = await supabase.rpc('is_owner', { _user_id: user.id });
      if (!isOwner) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - not your website' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[SendTestNotification] Sending to ${subscriber_id}, platform: ${subscriber.platform}`);

    let result = { success: false, message: '', platform: subscriber.platform || 'web', statusCode: 0 };

    // Send based on platform
    if (subscriber.fcm_token && subscriber.platform === 'android') {
      result = await sendFCMNotification(subscriber.fcm_token, {
        title,
        body: notifBody,
        icon: icon_url,
        image: image_url,
        url: click_url,
      });
    } else if (subscriber.endpoint && subscriber.p256dh_key && subscriber.auth_key) {
      result = await sendWebPushNotification(
        subscriber.endpoint,
        subscriber.p256dh_key,
        subscriber.auth_key,
        {
          title,
          body: notifBody,
          icon: icon_url || '/icon-192x192.png',
          image: image_url,
          url: click_url || '/',
          notificationId: `test-${Date.now()}`,
        },
        subscriber.websites.vapid_public_key,
        subscriber.websites.vapid_private_key,
        subscriber.websites.url
      );
    } else {
      result.message = 'No valid push credentials found';
    }

    // Log the notification
    await supabase.from('notification_logs').insert({
      website_id: subscriber.website_id,
      subscriber_id: subscriber.id,
      status: result.success ? 'sent' : 'failed',
      platform: result.platform,
      sent_at: result.success ? new Date().toISOString() : null,
      error_message: result.success ? null : result.message,
    });

    console.log('[SendTestNotification] Result:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SendTestNotification] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============ Web Push Functions ============

async function sendWebPushNotification(
  endpoint: string,
  p256dhKey: string,
  authKey: string,
  notification: any,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  websiteUrl: string
): Promise<{ success: boolean; message: string; platform: string; statusCode: number }> {
  try {
    console.log('[WebPush] Sending to:', endpoint.substring(0, 60) + '...');

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      image: notification.image,
      url: notification.url,
      notificationId: notification.notificationId,
      timestamp: Date.now(),
    });

    const audience = new URL(endpoint).origin;
    const vapidJwt = await createVapidJwt(audience, vapidPrivateKey, websiteUrl);

    const encryptedBody = await encryptPayload(payload, p256dhKey, authKey);

    // Convert Uint8Array to ArrayBuffer for fetch body
    const bodyBuffer = new ArrayBuffer(encryptedBody.length);
    new Uint8Array(bodyBuffer).set(encryptedBody);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
        'Authorization': `vapid t=${vapidJwt}, k=${vapidPublicKey}`,
      },
      body: bodyBuffer,
    });

    const statusCode = response.status;
    console.log('[WebPush] Response status:', statusCode);

    if (response.ok || statusCode === 201) {
      return {
        success: true,
        message: 'Push notification sent successfully',
        platform: 'web',
        statusCode,
      };
    }

    const errorText = await response.text();
    console.error('[WebPush] Error:', statusCode, errorText);

    if (statusCode === 404 || statusCode === 410) {
      return {
        success: false,
        message: 'Subscription expired or invalid',
        platform: 'web',
        statusCode,
      };
    }
    if (statusCode === 401 || statusCode === 403) {
      return {
        success: false,
        message: `VAPID authentication failed: ${errorText}`,
        platform: 'web',
        statusCode,
      };
    }

    return {
      success: false,
      message: `Push service error (${statusCode}): ${errorText}`,
      platform: 'web',
      statusCode,
    };
  } catch (error) {
    console.error('[WebPush] Exception:', error);
    return {
      success: false,
      message: String(error),
      platform: 'web',
      statusCode: 0,
    };
  }
}

async function createVapidJwt(
  audience: string,
  privateKeyBase64: string,
  subject: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = { typ: 'JWT', alg: 'ES256' };
  
  let sub = 'mailto:noreply@sigme.app';
  try {
    sub = subject.startsWith('mailto:')
      ? subject
      : `mailto:noreply@${new URL(subject).hostname}`;
  } catch {}

  const payload = {
    aud: audience,
    exp: now + 43200,
    sub,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKey = await importVapidPrivateKey(privateKeyBase64);

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const rawSig = derToRaw(new Uint8Array(signature));
  const signatureB64 = base64UrlEncode(rawSig);

  return `${signingInput}.${signatureB64}`;
}

async function importVapidPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  
  if (privateKeyBytes.length > 32) {
    const keyBuffer = new ArrayBuffer(privateKeyBytes.length);
    new Uint8Array(keyBuffer).set(privateKeyBytes);
    
    return await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  }
  
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);

  const pkcs8Key = new Uint8Array(pkcs8Header.length + 32);
  pkcs8Key.set(pkcs8Header);
  pkcs8Key.set(privateKeyBytes.slice(0, 32), pkcs8Header.length);

  const keyBuffer = new ArrayBuffer(pkcs8Key.length);
  new Uint8Array(keyBuffer).set(pkcs8Key);
  
  return await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

function derToRaw(der: Uint8Array): Uint8Array {
  let offset = 2;
  if (der[offset] !== 0x02) throw new Error('Invalid DER');
  offset++;
  const rLen = der[offset++];
  let r = der.slice(offset, offset + rLen);
  offset += rLen;
  
  if (der[offset] !== 0x02) throw new Error('Invalid DER');
  offset++;
  const sLen = der[offset++];
  let s = der.slice(offset, offset + sLen);
  
  while (r.length > 32 && r[0] === 0) r = r.slice(1);
  while (s.length > 32 && s[0] === 0) s = s.slice(1);
  
  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  
  return raw;
}

async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authKey: string
): Promise<Uint8Array> {
  const payloadBytes = new TextEncoder().encode(payload);
  const userPublicKeyBytes = base64UrlDecode(p256dhKey);
  const authSecretBytes = base64UrlDecode(authKey);

  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Convert Uint8Array to ArrayBuffer for crypto operations
  const userKeyBuffer = toArrayBuffer(userPublicKeyBytes);
  
  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    userKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey },
    ephemeralKeyPair.privateKey,
    256
  );

  const ephemeralPublicKey = await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey);
  const ephemeralPublicKeyBytes = new Uint8Array(ephemeralPublicKey);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyInfo = createInfo('aesgcm', userPublicKeyBytes, ephemeralPublicKeyBytes);
  const nonceInfo = createInfo('nonce', userPublicKeyBytes, ephemeralPublicKeyBytes);
  
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const prk = await hkdfExtract(authSecretBytes, new Uint8Array(sharedSecret));
  const ikm = await hkdfExpand(prk, authInfo, 32);
  
  const keyPrk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(keyPrk, keyInfo, 16);
  const nonce = await hkdfExpand(keyPrk, nonceInfo, 12);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(cek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const paddedPayload = new Uint8Array(2 + payloadBytes.length);
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, 2);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(nonce) },
    aesKey,
    paddedPayload
  );

  const recordSize = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  header[16] = (recordSize >> 24) & 0xff;
  header[17] = (recordSize >> 16) & 0xff;
  header[18] = (recordSize >> 8) & 0xff;
  header[19] = recordSize & 0xff;
  header[20] = 65;
  header.set(ephemeralPublicKeyBytes, 21);

  const result = new Uint8Array(header.length + ciphertext.byteLength);
  result.set(header);
  result.set(new Uint8Array(ciphertext), header.length);

  return result;
}

function createInfo(type: string, userPublicKey: Uint8Array, ephemeralKey: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(`Content-Encoding: ${type}\0`);
  const p256Bytes = new TextEncoder().encode('P-256\0');
  
  const info = new Uint8Array(
    typeBytes.length + p256Bytes.length + 2 + userPublicKey.length + 2 + ephemeralKey.length
  );
  
  let offset = 0;
  info.set(typeBytes, offset); offset += typeBytes.length;
  info.set(p256Bytes, offset); offset += p256Bytes.length;
  info[offset++] = 0; info[offset++] = 65;
  info.set(userPublicKey, offset); offset += userPublicKey.length;
  info[offset++] = 0; info[offset++] = 65;
  info.set(ephemeralKey, offset);
  
  return info;
}

// Helper to convert Uint8Array to ArrayBuffer (avoids SharedArrayBuffer type issues)
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  new Uint8Array(buffer).set(arr);
  return buffer;
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = await crypto.subtle.sign('HMAC', key, toArrayBuffer(ikm));
  return new Uint8Array(prk);
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(prk), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const input = new Uint8Array(info.length + 1);
  input.set(info);
  input[info.length] = 1;
  const okm = await crypto.subtle.sign('HMAC', key, toArrayBuffer(input));
  return new Uint8Array(okm).slice(0, length);
}

// ============ FCM Functions ============

async function sendFCMNotification(
  fcmToken: string,
  notification: any
): Promise<{ success: boolean; message: string; platform: string; statusCode: number }> {
  try {
    const accessToken = await getFCMAccessToken();
    if (!accessToken) {
      return { 
        success: false, 
        message: 'FCM not configured - add FCM_SERVICE_ACCOUNT_JSON secret', 
        platform: 'android',
        statusCode: 0 
      };
    }

    const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    const serviceAccount = JSON.parse(serviceAccountJson!);
    const projectId = serviceAccount.project_id;

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { 
              title: notification.title, 
              body: notification.body, 
              image: notification.image 
            },
            android: {
              priority: 'high',
              notification: {
                click_action: notification.url || 'OPEN_APP',
              },
            },
            data: { 
              url: notification.url || '',
            },
          },
        }),
      }
    );

    const statusCode = response.status;

    if (response.ok) {
      return { 
        success: true, 
        message: 'FCM notification sent successfully', 
        platform: 'android',
        statusCode 
      };
    }

    const error = await response.text();
    console.error('[FCM] Error:', statusCode, error);
    
    return { 
      success: false, 
      message: `FCM error: ${error}`, 
      platform: 'android',
      statusCode 
    };

  } catch (error) {
    console.error('[FCM] Exception:', error);
    return { 
      success: false, 
      message: String(error), 
      platform: 'android',
      statusCode: 0 
    };
  }
}

async function getFCMAccessToken(): Promise<string | null> {
  if (fcmAccessToken && fcmTokenExpiry > Date.now()) {
    return fcmAccessToken;
  }

  const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const jwt = await createRSAJwt(header, payload, serviceAccount.private_key);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!response.ok) {
      console.error('[FCM] Token error:', await response.text());
      return null;
    }

    const data = await response.json();
    fcmAccessToken = data.access_token;
    fcmTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    return fcmAccessToken;
  } catch (error) {
    console.error('[FCM] Token exception:', error);
    return null;
  }
}

async function createRSAJwt(header: any, payload: any, privateKeyPem: string): Promise<string> {
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    toArrayBuffer(keyBytes),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

// ============ Utility Functions ============

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): Uint8Array {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
