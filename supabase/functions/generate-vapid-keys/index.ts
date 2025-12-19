/**
 * Generate VAPID Keys Edge Function
 * 
 * Generates cryptographically secure VAPID key pairs using P-256 curve.
 * These keys are required for Web Push Protocol compliance (RFC 8292).
 * 
 * WHY THIS IS NEEDED:
 * - VAPID keys MUST be generated using ECDSA P-256 curve
 * - Client-side random string generation is NOT valid
 * - Push services will reject invalid VAPID credentials
 * 
 * OUTPUT FORMAT:
 * - publicKey: Base64URL encoded uncompressed P-256 public key (65 bytes -> ~87 chars)
 *   - MUST start with 'B' when decoded (0x04 uncompressed point marker)
 * - privateKey: Base64URL encoded PKCS8 format private key
 *   - Can be used directly with Web Crypto API
 * 
 * VALIDATION:
 * - Public key decodes to exactly 65 bytes
 * - First byte is 0x04 (uncompressed EC point)
 * - Follows base64url spec (- and _ chars, no padding)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GenerateVAPIDKeys] Generating keys for user:', user.id);

    // Generate ECDSA P-256 key pair using Web Crypto API
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true, // extractable - required to export the keys
      ['sign', 'verify']
    );

    // Export public key in RAW format (uncompressed P-256 point = 65 bytes)
    // Format: 0x04 || x (32 bytes) || y (32 bytes)
    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const publicKeyBytes = new Uint8Array(publicKeyRaw);
    
    // Validate public key format
    if (publicKeyBytes.length !== 65) {
      throw new Error(`Invalid public key length: ${publicKeyBytes.length}, expected 65`);
    }
    if (publicKeyBytes[0] !== 0x04) {
      throw new Error(`Invalid public key format: first byte is ${publicKeyBytes[0]}, expected 0x04`);
    }

    // Export private key in PKCS8 format (for easy import with Web Crypto)
    const privateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBytes = new Uint8Array(privateKeyPkcs8);

    // Convert to URL-safe base64 (required by Web Push)
    const publicKey = arrayBufferToBase64Url(publicKeyBytes);
    const privateKey = arrayBufferToBase64Url(privateKeyBytes);

    // Validate the generated public key
    const validationResult = validateVapidPublicKey(publicKey);
    if (!validationResult.valid) {
      console.error('[GenerateVAPIDKeys] Validation failed:', validationResult.error);
      throw new Error(`Generated key failed validation: ${validationResult.error}`);
    }

    console.log('[GenerateVAPIDKeys] Keys generated successfully');
    console.log('[GenerateVAPIDKeys] Public key length:', publicKey.length, 'chars');
    console.log('[GenerateVAPIDKeys] Public key starts with:', publicKey.substring(0, 4));

    return new Response(
      JSON.stringify({
        success: true,
        publicKey,
        privateKey,
        // Include validation info for debugging
        validation: {
          publicKeyLength: publicKey.length,
          decodedLength: publicKeyBytes.length,
          startsWithB: publicKey.startsWith('B'),
          firstByteHex: '0x' + publicKeyBytes[0].toString(16).padStart(2, '0'),
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GenerateVAPIDKeys] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate keys', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Convert ArrayBuffer to URL-safe base64 (RFC 4648 Section 5)
 * 
 * Web Push requires base64url encoding:
 * - Replace + with -
 * - Replace / with _
 * - Remove padding (=)
 */
function arrayBufferToBase64Url(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Validate a VAPID public key
 * 
 * Checks:
 * 1. Base64URL format compliance
 * 2. Decodes to exactly 65 bytes
 * 3. First byte is 0x04 (uncompressed EC point marker)
 * 4. Key starts with 'B' in base64url (because 0x04 encodes to 'B...')
 */
function validateVapidPublicKey(publicKey: string): { valid: boolean; error?: string } {
  // Check base64url format (only alphanumeric, -, and _)
  if (!/^[A-Za-z0-9_-]+$/.test(publicKey)) {
    return { valid: false, error: 'Contains invalid characters (not base64url)' };
  }

  // P-256 uncompressed public key should be 65 bytes = ~87 base64url chars
  if (publicKey.length < 85 || publicKey.length > 90) {
    return { valid: false, error: `Invalid length: ${publicKey.length} chars (expected 85-90)` };
  }

  // Must start with 'B' (0x04 in first position encodes to 'B...')
  if (!publicKey.startsWith('B')) {
    return { valid: false, error: `Must start with 'B' (uncompressed point), got '${publicKey[0]}'` };
  }

  // Decode and verify length
  try {
    const decoded = base64UrlDecode(publicKey);
    if (decoded.length !== 65) {
      return { valid: false, error: `Decoded to ${decoded.length} bytes, expected 65` };
    }
    if (decoded[0] !== 0x04) {
      return { valid: false, error: `First byte is 0x${decoded[0].toString(16)}, expected 0x04` };
    }
  } catch (e) {
    return { valid: false, error: `Decode failed: ${e}` };
  }

  return { valid: true };
}

/**
 * Decode base64url string to Uint8Array
 */
function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  const padding = '='.repeat((4 - str.length % 4) % 4);
  // Convert base64url to standard base64
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
