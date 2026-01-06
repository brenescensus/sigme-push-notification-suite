/**
 * Send Test Notification Edge Function
 * 
 * PRODUCTION-READY test notification sender that:
 * - Sends real push notifications via Web Push or FCM
 * - Uses proper VAPID signing for Web Push (RFC 8292)
 * - Logs delivery status for debugging
 * 
 * This is for testing individual subscriber notifications.
 */

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

    // Get subscriber details with website VAPID keys
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*, websites!inner(user_id, vapid_public_key, vapid_private_key, url)')
      .eq('id', subscriber_id)
      .single();

    if (subError || !subscriber) {
      console.error('Subscriber fetch error:', subError);
      return new Response(
        JSON.stringify({ error: 'Subscriber not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this website or is owner
    if (subscriber.websites.user_id !== user.id) {
      const { data: isOwner } = await supabase.rpc('is_owner', { _user_id: user.id });
      if (!isOwner) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[SendTestNotification] Sending to subscriber ${subscriber_id}, platform: ${subscriber.platform}`);

    let result = { success: false, message: '', platform: subscriber.platform || 'web', statusCode: 0 };

    // Send based on platform
    if (subscriber.fcm_token && subscriber.platform === 'android') {
      // Send via FCM for Android
      result = await sendFCMNotification(subscriber.fcm_token, {
        title,
        body,
        icon: icon_url,
        image: image_url,
        url: click_url,
      });
    } else if (subscriber.endpoint && subscriber.p256dh_key && subscriber.auth_key) {
      // Send via Web Push with proper VAPID signing
      result = await sendWebPushNotification(
        subscriber.endpoint,
        subscriber.p256dh_key,
        subscriber.auth_key,
        {
          title,
          body,
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

    console.log(`[SendTestNotification] Result:`, result);

    return new Response(
      JSON.stringify(result),
      // Always return 200 so the client can display detailed failure reasons.
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

/**
 * Send Web Push notification with proper VAPID JWT signing (RFC 8292)
 */
async function sendWebPushNotification(
  endpoint: string,
  p256dhKey: string,
  authKey: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
    url?: string;
    notificationId?: string;
  },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  websiteUrl: string
): Promise<{ success: boolean; message: string; platform: string; statusCode: number }> {
  try {
    console.log('[WebPush] Preparing notification to:', endpoint.substring(0, 50) + '...');

    const payloadJson = JSON.stringify({
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

    const { body } = await encryptWebPushAes128Gcm(
      new TextEncoder().encode(payloadJson),
      p256dhKey,
      authKey
    );

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
        // VAPID (RFC 8292)
        'Crypto-Key': `p256ecdsa=${vapidPublicKey}`,
        'Authorization': `Bearer ${vapidJwt}`,
      },
      body: body as unknown as BodyInit,
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
    console.error('[WebPush] Error response:', errorText);

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

/**
 * Create VAPID JWT token for Web Push authorization (RFC 8292)
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

  let sub = 'mailto:noreply@example.com';
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

  // Import the private key
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
 */
async function importVapidPrivateKey(privateKeyBase64: string): Promise<CryptoKey> {
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  
  // Check if this is PKCS8 format (longer) or raw 32-byte key
  if (privateKeyBytes.length > 32) {
    // PKCS8 format from our key generator
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
  }
  
  // For raw 32-byte keys, construct a PKCS8 wrapper
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
  const keyView = new Uint8Array(keyBuffer);
  keyView.set(pkcs8Key);
  
  return await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

/**
 * Send FCM notification for Android
 */
async function sendFCMNotification(
  fcmToken: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
    url?: string;
  }
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
                icon: notification.icon || 'ic_notification',
                click_action: notification.url || 'OPEN_APP',
              },
            },
            data: { 
              url: notification.url || '', 
              test: 'true' 
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
    console.error('[FCM] Error:', error);
    
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
    const nowSec = Math.floor(Date.now() / 1000);
    const expiry = nowSec + 3600;

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: expiry,
    };

    const jwt = await createFCMJwt(header, payload, serviceAccount.private_key);

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

async function createFCMJwt(header: object, payload: object, privateKeyPem: string): Promise<string> {
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKey = await importRSAPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

async function importRSAPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

type Bytes = Uint8Array<ArrayBuffer>;

async function encryptWebPushAes128Gcm(
  plaintext: Uint8Array,
  userPublicKeyB64Url: string,
  userAuthB64Url: string
): Promise<{ body: Bytes; saltB64Url: string; dhB64Url: string }> {
  // RFC 8291 - aes128gcm
  const salt = crypto.getRandomValues(new Uint8Array(16)) as Bytes;

  const userPublicKeyBytes = base64UrlDecode(userPublicKeyB64Url);
  const userAuthSecret = base64UrlDecode(userAuthB64Url);

  // Ephemeral ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  ) as Bytes;

  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    userPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: userPublicKey },
      serverKeyPair.privateKey,
      256
    )
  ) as Bytes;

  // Derive IKM = HKDF-Expand(HKDF-Extract(auth, sharedSecret), "Content-Encoding: auth\0", 32)
  const prk = await hkdfExtract(userAuthSecret, sharedSecret);
  const ikm = await hkdfExpand(prk, new TextEncoder().encode('Content-Encoding: auth\0'), 32);

  // PRK' = HKDF-Extract(salt, IKM)
  const prk2 = await hkdfExtract(salt, ikm);

  const context = createWebPushContext(userPublicKeyBytes, serverPublicKeyRaw);

  const cekInfo = concatBytes(new TextEncoder().encode('Content-Encoding: aes128gcm\0'), context);
  const nonceInfo = concatBytes(new TextEncoder().encode('Content-Encoding: nonce\0'), context);

  const cek = await hkdfExpand(prk2, cekInfo, 16);
  const nonce = await hkdfExpand(prk2, nonceInfo, 12);

  // Append padding delimiter (0x02) per RFC 8291 (no padding)
  const paddedPlaintext = concatBytes(plaintext, new Uint8Array([0x02]));

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPlaintext)
  ) as Bytes;

  // Build binary header (salt + rs(4096) + idlen + dh)
  const rs = 4096;
  const rsBytes = new Uint8Array([
    (rs >>> 24) & 0xff,
    (rs >>> 16) & 0xff,
    (rs >>> 8) & 0xff,
    rs & 0xff,
  ]) as Bytes;

  const idLen = new Uint8Array([serverPublicKeyRaw.length]) as Bytes;
  const header = concatBytes(concatBytes(concatBytes(salt, rsBytes), idLen), serverPublicKeyRaw);

  return {
    body: concatBytes(header, ciphertext),
    saltB64Url: base64UrlEncode(salt),
    dhB64Url: base64UrlEncode(serverPublicKeyRaw),
  };
}

function createWebPushContext(clientPublicKeyRaw: Bytes, serverPublicKeyRaw: Bytes): Bytes {
  // "P-256\0" + uint16be(len(client)) + client + uint16be(len(server)) + server
  const label = new TextEncoder().encode('P-256\0');
  const clientLen = uint16be(clientPublicKeyRaw.length);
  const serverLen = uint16be(serverPublicKeyRaw.length);
  return concatBytes(
    concatBytes(
      concatBytes(concatBytes(label, clientLen), clientPublicKeyRaw),
      serverLen
    ),
    serverPublicKeyRaw
  );
}

function uint16be(value: number): Bytes {
  const buf = new ArrayBuffer(2);
  const out = new Uint8Array(buf) as Bytes;
  out[0] = (value >>> 8) & 0xff;
  out[1] = value & 0xff;
  return out;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Bytes {
  const buf = new ArrayBuffer(a.length + b.length);
  const out = new Uint8Array(buf) as Bytes;
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

async function hkdfExtract(salt: Bytes, ikm: Bytes): Promise<Bytes> {
  const key = await crypto.subtle.importKey(
    'raw',
    salt,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const prk = await crypto.subtle.sign('HMAC', key, ikm);
  return new Uint8Array(prk) as Bytes;
}

async function hkdfExpand(prk: Bytes, info: Uint8Array, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const hashLen = 32;
  const n = Math.ceil(length / hashLen);

  let t = new Uint8Array(new ArrayBuffer(0)) as Bytes;
  let okm = new Uint8Array(new ArrayBuffer(0)) as Bytes;

  for (let i = 1; i <= n; i++) {
    const input = concatBytes(concatBytes(t, info), new Uint8Array([i]));
    t = new Uint8Array(await crypto.subtle.sign('HMAC', key, input)) as Bytes;
    okm = concatBytes(okm, t);
  }

  return okm.slice(0, length) as Bytes;
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

function base64UrlDecode(str: string): Bytes {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);

  const buf = new ArrayBuffer(rawData.length);
  const out = new Uint8Array(buf) as Bytes;
  for (let i = 0; i < rawData.length; ++i) {
    out[i] = rawData.charCodeAt(i);
  }
  return out;
}
