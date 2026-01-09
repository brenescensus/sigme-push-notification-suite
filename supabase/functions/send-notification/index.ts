/**
 * Send Notification Edge Function v2
 * 
 * Production-ready push notification engine:
 * - Web Push with VAPID JWT signing (RFC 8292)
 * - FCM HTTP v1 API for Android
 * - Proper CORS handling
 * - Health check endpoint
 * - Comprehensive error handling
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

// Configuration
const BATCH_SIZE = 50;
const MAX_RETRIES = 2;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Health check endpoint
  if (req.method === 'GET' && (url.pathname.endsWith('/health') || url.pathname === '/send-notification')) {
    return new Response(
      JSON.stringify({ 
        status: 'healthy', 
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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[SendNotification] Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { campaignId, websiteId, notification, targetSubscriberIds } = body;

    console.log('[SendNotification] Request received:', { campaignId, websiteId, hasNotification: !!notification });

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
      console.error('[SendNotification] Website not found:', websiteId, websiteError);
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
      console.error('[SendNotification] Subscribers fetch error:', subscribersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscribers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('[SendNotification] No active subscribers found');
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, message: 'No active subscribers' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SendNotification] Sending to ${subscribers.length} subscribers`);

    // Separate by platform
    const webSubscribers = subscribers.filter((s: any) => 
      (s.platform === 'web' || !s.platform) && s.endpoint && s.p256dh_key && s.auth_key
    );
    const androidSubscribers = subscribers.filter((s: any) => 
      s.platform === 'android' && s.fcm_token
    );

    console.log(`[SendNotification] Web: ${webSubscribers.length}, Android: ${androidSubscribers.length}`);

    let sentCount = 0;
    let failedCount = 0;
    const failedSubscriberIds: string[] = [];

    // Process Web Push subscribers in batches
    for (let i = 0; i < webSubscribers.length; i += BATCH_SIZE) {
      const batch = webSubscribers.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.allSettled(
        batch.map((subscriber: any) => 
          sendWebPushWithRetry(
            subscriber,
            notification,
            website.vapid_public_key,
            website.vapid_private_key,
            website.url
          )
        )
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const subscriber = batch[j];
        
        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++;
          await logNotification(supabase, campaignId, subscriber.id, websiteId, 'sent', 'web');
        } else {
          failedCount++;
          const error = result.status === 'rejected' 
            ? String(result.reason) 
            : result.value.error || 'Unknown error';
          await logNotification(supabase, campaignId, subscriber.id, websiteId, 'failed', 'web', error);
          
          if (isExpiredSubscription(error)) {
            failedSubscriberIds.push(subscriber.id);
          }
        }
      }
    }

    // Process Android subscribers in batches
    for (let i = 0; i < androidSubscribers.length; i += BATCH_SIZE) {
      const batch = androidSubscribers.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.allSettled(
        batch.map((subscriber: any) => 
          sendFCMNotification(subscriber.fcm_token, notification)
        )
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const subscriber = batch[j];
        
        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++;
          await logNotification(supabase, campaignId, subscriber.id, websiteId, 'sent', 'android');
        } else {
          failedCount++;
          const error = result.status === 'rejected' 
            ? String(result.reason) 
            : result.value.error || 'Unknown error';
          await logNotification(supabase, campaignId, subscriber.id, websiteId, 'failed', 'android', error);
          
          if (isExpiredSubscription(error)) {
            failedSubscriberIds.push(subscriber.id);
          }
        }
      }
    }

    // Mark expired subscriptions as inactive
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

    console.log(`[SendNotification] Completed: ${sentCount} sent, ${failedCount} failed`);

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
    console.error('[SendNotification] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============ Helper Functions ============

async function sendWebPushWithRetry(
  subscriber: any,
  notification: any,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  websiteUrl: string,
  retries = MAX_RETRIES
): Promise<{ success: boolean; error?: string }> {
  let lastError = '';
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await sendWebPushNotification(
        subscriber,
        notification,
        vapidPublicKey,
        vapidPrivateKey,
        websiteUrl
      );
      
      if (result.success) return result;
      lastError = result.error || 'Unknown error';
      
      // Don't retry permanent failures
      if (isPermanentFailure(lastError)) return result;
      
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1)); // Simple backoff
      }
    } catch (err) {
      lastError = String(err);
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }
  
  return { success: false, error: lastError };
}

async function sendWebPushNotification(
  subscriber: any,
  notification: any,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  websiteUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { endpoint, p256dh_key, auth_key } = subscriber;

    if (!endpoint || !p256dh_key || !auth_key) {
      return { success: false, error: 'Missing subscription credentials' };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      image: notification.image,
      url: notification.url || '/',
      actions: notification.actions || [],
      notificationId: notification.notificationId || `notif-${Date.now()}`,
      timestamp: Date.now(),
    });

    const audience = new URL(endpoint).origin;
    const vapidJwt = await createVapidJwt(audience, vapidPrivateKey, websiteUrl);

    const encryptedBody = await encryptPayload(payload, p256dh_key, auth_key);

    // Create proper ArrayBuffer for fetch body
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

    if (response.ok || response.status === 201) {
      return { success: true };
    }

    const status = response.status;
    if (status === 404 || status === 410) {
      return { success: false, error: 'SUBSCRIPTION_EXPIRED' };
    }
    if (status === 401 || status === 403) {
      const text = await response.text();
      console.error('[WebPush] Auth failed:', status, text);
      return { success: false, error: `VAPID_AUTH_FAILED: ${text}` };
    }

    const errorText = await response.text();
    console.error('[WebPush] Failed:', status, errorText);
    return { success: false, error: `HTTP_${status}: ${errorText}` };
  } catch (error) {
    console.error('[WebPush] Exception:', error);
    return { success: false, error: String(error) };
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
  } catch {
    // keep fallback
  }

  const payload = {
    aud: audience,
    exp: now + 43200, // 12 hours
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

  // Convert DER signature to raw format (64 bytes: r || s)
  const rawSig = derToRaw(new Uint8Array(signature));
  const signatureB64 = base64UrlEncode(rawSig);

  return `${signingInput}.${signatureB64}`;
}

async function importVapidPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  
  // PKCS8 format (longer than 32 bytes)
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
  
  // Raw 32-byte key - wrap in PKCS8
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

// Convert DER-encoded ECDSA signature to raw format
function derToRaw(der: Uint8Array): Uint8Array {
  // DER format: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  // Raw format: <r padded to 32 bytes><s padded to 32 bytes>
  
  let offset = 2; // Skip 0x30 and length
  
  // Parse R
  if (der[offset] !== 0x02) throw new Error('Invalid DER: expected 0x02 for R');
  offset++;
  const rLen = der[offset++];
  let r = der.slice(offset, offset + rLen);
  offset += rLen;
  
  // Parse S
  if (der[offset] !== 0x02) throw new Error('Invalid DER: expected 0x02 for S');
  offset++;
  const sLen = der[offset++];
  let s = der.slice(offset, offset + sLen);
  
  // Remove leading zeros and pad to 32 bytes
  while (r.length > 32 && r[0] === 0) r = r.slice(1);
  while (s.length > 32 && s[0] === 0) s = s.slice(1);
  
  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  
  return raw;
}

// Web Push payload encryption (RFC 8291)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authKey: string
): Promise<Uint8Array> {
  const payloadBytes = new TextEncoder().encode(payload);
  const userPublicKeyBytes = base64UrlDecode(p256dhKey);
  const authSecretBytes = base64UrlDecode(authKey);

  // Helper to create proper ArrayBuffer (required for Deno's strict types)
  const toBuffer = (arr: Uint8Array): ArrayBuffer => {
    const buf = new ArrayBuffer(arr.length);
    new Uint8Array(buf).set(arr);
    return buf;
  };

  // Generate ephemeral key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Import user's public key
  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(userPublicKeyBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey },
    ephemeralKeyPair.privateKey,
    256
  );

  // Export ephemeral public key
  const ephemeralPublicKey = await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey);
  const ephemeralPublicKeyBytes = new Uint8Array(ephemeralPublicKey);

  // HKDF to derive encryption key and nonce
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // info for key derivation
  const keyInfo = createInfo('aesgcm', userPublicKeyBytes, ephemeralPublicKeyBytes);
  const nonceInfo = createInfo('nonce', userPublicKeyBytes, ephemeralPublicKeyBytes);
  
  // PRK from auth secret and shared secret
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const prk = await hkdfExtract(authSecretBytes, new Uint8Array(sharedSecret));
  const ikm = await hkdfExpand(prk, authInfo, 32);
  
  // Derive CEK and nonce
  const keyPrk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(keyPrk, keyInfo, 16);
  const nonce = await hkdfExpand(keyPrk, nonceInfo, 12);

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    toBuffer(cek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Pad payload (add 2-byte padding length prefix)
  const paddingLength = 0;
  const paddedPayload = new Uint8Array(2 + paddingLength + payloadBytes.length);
  paddedPayload[0] = (paddingLength >> 8) & 0xff;
  paddedPayload[1] = paddingLength & 0xff;
  paddedPayload.set(payloadBytes, 2 + paddingLength);

  // Encrypt
  const nonceBuf = new ArrayBuffer(nonce.length);
  new Uint8Array(nonceBuf).set(nonce);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBuf },
    aesKey,
    paddedPayload
  );

  // Build aes128gcm encrypted content
  // Header: salt (16) | rs (4) | idlen (1) | keyid (65)
  const recordSize = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  header[16] = (recordSize >> 24) & 0xff;
  header[17] = (recordSize >> 16) & 0xff;
  header[18] = (recordSize >> 8) & 0xff;
  header[19] = recordSize & 0xff;
  header[20] = 65; // keyid length
  header.set(ephemeralPublicKeyBytes, 21);

  // Combine header and ciphertext
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

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const saltBuf = new ArrayBuffer(salt.length);
  new Uint8Array(saltBuf).set(salt);
  const ikmBuf = new ArrayBuffer(ikm.length);
  new Uint8Array(ikmBuf).set(ikm);
  const key = await crypto.subtle.importKey('raw', saltBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = await crypto.subtle.sign('HMAC', key, ikmBuf);
  return new Uint8Array(prk);
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prkBuf = new ArrayBuffer(prk.length);
  new Uint8Array(prkBuf).set(prk);
  const key = await crypto.subtle.importKey('raw', prkBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const input = new Uint8Array(info.length + 1);
  input.set(info);
  input[info.length] = 1;
  const inputBuf = new ArrayBuffer(input.length);
  new Uint8Array(inputBuf).set(input);
  const okm = await crypto.subtle.sign('HMAC', key, inputBuf);
  return new Uint8Array(okm).slice(0, length);
}

// FCM Notification
async function sendFCMNotification(
  fcmToken: string,
  notification: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getFCMAccessToken();
    if (!accessToken) {
      return { success: false, error: 'FCM not configured' };
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
              image: notification.image,
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

    if (response.ok) {
      return { success: true };
    }

    const error = await response.text();
    console.error('[FCM] Error:', response.status, error);
    
    if (response.status === 404 || error.includes('UNREGISTERED')) {
      return { success: false, error: 'SUBSCRIPTION_EXPIRED' };
    }
    
    return { success: false, error: `FCM_${response.status}: ${error}` };
  } catch (error) {
    console.error('[FCM] Exception:', error);
    return { success: false, error: String(error) };
  }
}

async function getFCMAccessToken(): Promise<string | null> {
  if (fcmAccessToken && fcmTokenExpiry > Date.now()) {
    return fcmAccessToken;
  }

  const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    console.log('[FCM] FCM_SERVICE_ACCOUNT_JSON not configured');
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

  // Import RSA private key
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
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

// Utility functions
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
      campaign_id: campaignId || null,
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

function isPermanentFailure(error: string): boolean {
  const permanentCodes = ['SUBSCRIPTION_EXPIRED', 'UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND'];
  return permanentCodes.some(code => error.includes(code));
}

function isExpiredSubscription(error: string): boolean {
  return error.includes('SUBSCRIPTION_EXPIRED') || error.includes('UNREGISTERED') || error.includes('410');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
