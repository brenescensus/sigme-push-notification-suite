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

    // Input validation - subscriber_id (required, UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!subscriber_id || typeof subscriber_id !== 'string' || !uuidRegex.test(subscriber_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscriber_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation - title (required, string, max 200 chars)
    if (!title || typeof title !== 'string' || title.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Invalid title (max 200 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation - body (required, string, max 1000 chars)
    if (!notifBody || typeof notifBody !== 'string' || notifBody.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Invalid body (max 1000 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate optional URL fields
    if (icon_url && (typeof icon_url !== 'string' || icon_url.length > 2000)) {
      return new Response(
        JSON.stringify({ error: 'Invalid icon_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (image_url && (typeof image_url !== 'string' || image_url.length > 2000)) {
      return new Response(
        JSON.stringify({ error: 'Invalid image_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (click_url && (typeof click_url !== 'string' || click_url.length > 2000)) {
      return new Response(
        JSON.stringify({ error: 'Invalid click_url' }),
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

    // Get Firebase VAPID keys from secrets (these must match what was used to create subscriptions)
    const firebaseVapidPublicKey = Deno.env.get('FIREBASE_VAPID_PUBLIC_KEY');
    const firebaseVapidPrivateKey = Deno.env.get('FIREBASE_VAPID_PRIVATE_KEY');
    
    if (!firebaseVapidPublicKey || !firebaseVapidPrivateKey) {
      console.error('[SendTestNotification] Firebase VAPID keys not configured in secrets');
      return new Response(
        JSON.stringify({ 
          error: 'VAPID keys not configured',
          message: 'Please add FIREBASE_VAPID_PUBLIC_KEY and FIREBASE_VAPID_PRIVATE_KEY secrets' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SendTestNotification] Using Firebase VAPID public key:', firebaseVapidPublicKey.substring(0, 20) + '...');

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
        firebaseVapidPublicKey,
        firebaseVapidPrivateKey,
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
    console.log('[WebPush] ========================================');
    console.log('[WebPush] SENDING NOTIFICATION');
    console.log('[WebPush] ========================================');
    console.log('[WebPush] Endpoint:', endpoint.substring(0, 80) + '...');
    console.log('[WebPush] p256dh key length:', p256dhKey?.length || 0);
    console.log('[WebPush] auth key length:', authKey?.length || 0);
    console.log('[WebPush] VAPID public key prefix:', vapidPublicKey?.substring(0, 30) + '...');
    console.log('[WebPush] Website URL:', websiteUrl);

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      image: notification.image,
      url: notification.url,
      notificationId: notification.notificationId,
      timestamp: Date.now(),
    });

    console.log('[WebPush] Payload size:', payload.length, 'bytes');
    console.log('[WebPush] Payload preview:', payload.substring(0, 200));

    const audience = new URL(endpoint).origin;
    console.log('[WebPush] VAPID audience:', audience);
    
    console.log('[WebPush] Creating VAPID JWT...');
    const vapidJwt = await createVapidJwt(audience, vapidPublicKey, vapidPrivateKey, websiteUrl);
    console.log('[WebPush] VAPID JWT created, length:', vapidJwt.length);

    console.log('[WebPush] Encrypting payload with AES-128-GCM...');
    const encryptedBody = await encryptPayload(payload, p256dhKey, authKey);
    console.log('[WebPush] Encrypted body size:', encryptedBody.length, 'bytes');

    // Convert Uint8Array to ArrayBuffer for fetch body
    const bodyBuffer = new ArrayBuffer(encryptedBody.length);
    new Uint8Array(bodyBuffer).set(encryptedBody);
    
    console.log('[WebPush] Sending HTTP POST to push service...');
    const startTime = Date.now();
    
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

    const elapsed = Date.now() - startTime;
    const statusCode = response.status;
    console.log('[WebPush] Response received in', elapsed, 'ms');
    console.log('[WebPush] Response status:', statusCode);
    console.log('[WebPush] Response status text:', response.statusText);

    if (response.ok || statusCode === 201) {
      console.log('[WebPush] ✓ SUCCESS - Notification delivered to push service');
      console.log('[WebPush] The push service has accepted the notification for delivery.');
      console.log('[WebPush] Browser should receive push event shortly.');
      return {
        success: true,
        message: 'Push notification sent successfully',
        platform: 'web',
        statusCode,
      };
    }

    const errorText = await response.text();
    console.error('[WebPush] ✗ FAILED - Push service rejected notification');
    console.error('[WebPush] Status:', statusCode);
    console.error('[WebPush] Error body:', errorText);

    if (statusCode === 404 || statusCode === 410) {
      console.error('[WebPush] Subscription is expired or no longer valid.');
      console.error('[WebPush] The browser has unsubscribed or endpoint changed.');
      return {
        success: false,
        message: 'Subscription expired or invalid',
        platform: 'web',
        statusCode,
      };
    }
    if (statusCode === 401 || statusCode === 403) {
      console.error('[WebPush] VAPID authentication failed.');
      console.error('[WebPush] This usually means the private key does not match the public key');
      console.error('[WebPush] used when the browser created the subscription.');
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
    console.error('[WebPush] ✗ EXCEPTION during notification send:');
    console.error('[WebPush] Error name:', (error as any)?.name);
    console.error('[WebPush] Error message:', (error as any)?.message);
    console.error('[WebPush] Full error:', error);
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
  publicKeyBase64: string,
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

  const privateKey = await importVapidSigningKey(publicKeyBase64, privateKeyBase64);

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  // Convert signature to raw format (handles both DER and raw from different runtimes)
  const rawSig = signatureToRaw(new Uint8Array(signature));
  const signatureB64 = base64UrlEncode(rawSig);

  return `${signingInput}.${signatureB64}`;
}

async function importVapidSigningKey(
  publicKeyBase64: string,
  privateKeyBase64: string
): Promise<CryptoKey> {
  // Use JWK import (most reliable across runtimes) so we avoid PKCS8 encoding pitfalls.
  // publicKey: base64url encoded uncompressed point (65 bytes: 0x04 || X(32) || Y(32))
  // privateKey: base64url encoded 32-byte scalar ("d")

  const pub = base64UrlDecode(publicKeyBase64);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error(`[VAPID] Invalid public key format/length: ${pub.length}`);
  }

  const x = pub.slice(1, 33);
  const y = pub.slice(33, 65);

  // Decode private key (base64url or base64)
  let dBytes: Uint8Array;
  try {
    dBytes = base64UrlDecode(privateKeyBase64);
  } catch {
    const binary = atob(privateKeyBase64);
    dBytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  }

  if (dBytes.length !== 32) {
    // Sometimes people paste PKCS8; if so, fail loudly so we can correct the secret.
    throw new Error(`[VAPID] Private key must be 32 bytes base64url (got ${dBytes.length})`);
  }

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    d: base64UrlEncode(dBytes),
    ext: true,
  };

  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

// Convert ECDSA signature to raw format (handles both DER and raw)
function signatureToRaw(sig: Uint8Array): Uint8Array {
  // If already 64 bytes, assume it's raw format
  if (sig.length === 64) {
    return sig;
  }
  
  // Check if it's DER format (starts with 0x30)
  if (sig.length > 64 && sig[0] === 0x30) {
    return derToRaw(sig);
  }
  
  // For other lengths, try DER parsing
  if (sig.length > 64) {
    try {
      return derToRaw(sig);
    } catch {
      // Fall through to padding
    }
  }
  
  // Pad or truncate to 64 bytes
  const raw = new Uint8Array(64);
  if (sig.length >= 64) {
    raw.set(sig.slice(0, 64));
  } else {
    raw.set(sig, 64 - sig.length);
  }
  return raw;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // DER format: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  let offset = 0;
  
  if (der[offset] !== 0x30) throw new Error('Invalid DER: expected SEQUENCE');
  offset++;
  
  // Handle length byte(s)
  let seqLen = der[offset++];
  if (seqLen & 0x80) {
    const numBytes = seqLen & 0x7f;
    seqLen = 0;
    for (let i = 0; i < numBytes; i++) {
      seqLen = (seqLen << 8) | der[offset++];
    }
  }
  
  // Parse R
  if (der[offset] !== 0x02) throw new Error('Invalid DER: expected INTEGER for R');
  offset++;
  let rLen = der[offset++];
  if (rLen & 0x80) {
    const numBytes = rLen & 0x7f;
    rLen = 0;
    for (let i = 0; i < numBytes; i++) {
      rLen = (rLen << 8) | der[offset++];
    }
  }
  let r = der.slice(offset, offset + rLen);
  offset += rLen;
  
  // Parse S
  if (der[offset] !== 0x02) throw new Error('Invalid DER: expected INTEGER for S');
  offset++;
  let sLen = der[offset++];
  if (sLen & 0x80) {
    const numBytes = sLen & 0x7f;
    sLen = 0;
    for (let i = 0; i < numBytes; i++) {
      sLen = (sLen << 8) | der[offset++];
    }
  }
  let s = der.slice(offset, offset + sLen);
  
  // Remove leading zeros (DER uses signed integers)
  while (r.length > 32 && r[0] === 0) r = r.slice(1);
  while (s.length > 32 && s[0] === 0) s = s.slice(1);
  
  // Pad to 32 bytes each
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
  // Robust base64url decoder that handles edge cases
  try {
    // Clean input - remove whitespace
    const cleaned = input.trim().replace(/\s/g, '');
    
    // Convert base64url to base64
    let base64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding
    while (base64.length % 4) base64 += '=';
    
    // Use a lookup table approach for robustness
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
      lookup[chars.charCodeAt(i)] = i;
    }
    
    // Remove padding for calculation
    const paddingLen = (base64.match(/=+$/) || [''])[0].length;
    const len = (base64.length * 3 / 4) - paddingLen;
    
    const bytes = new Uint8Array(len);
    let p = 0;
    
    for (let i = 0; i < base64.length; ) {
      const c1 = lookup[base64.charCodeAt(i++)];
      const c2 = lookup[base64.charCodeAt(i++)];
      const c3 = lookup[base64.charCodeAt(i++)];
      const c4 = lookup[base64.charCodeAt(i++)];
      
      if (p < len) bytes[p++] = (c1 << 2) | (c2 >> 4);
      if (p < len) bytes[p++] = ((c2 & 15) << 4) | (c3 >> 2);
      if (p < len) bytes[p++] = ((c3 & 3) << 6) | c4;
    }
    
    return bytes;
  } catch (e) {
    console.error('[base64UrlDecode] Error decoding:', input.substring(0, 20) + '...', e);
    throw new Error(`InvalidEncoding: ${e}`);
  }
}
