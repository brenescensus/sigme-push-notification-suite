/**
 * Generate VAPID Keys Edge Function
 * 
 * Generates cryptographically secure VAPID key pairs using P-256 curve.
 * These keys are required for Web Push Protocol compliance.
 * 
 * WHY THIS IS NEEDED:
 * - VAPID keys must be generated using ECDSA P-256 curve
 * - Client-side random string generation is NOT valid
 * - Push services will reject invalid VAPID credentials
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
      true, // extractable
      ['sign', 'verify']
    );

    // Export public key in raw format (uncompressed)
    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const publicKeyBytes = new Uint8Array(publicKeyRaw);
    
    // Export private key in PKCS8 format
    const privateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBytes = new Uint8Array(privateKeyPkcs8);

    // Convert to URL-safe base64 (required by Web Push)
    const publicKey = arrayBufferToBase64Url(publicKeyBytes);
    const privateKey = arrayBufferToBase64Url(privateKeyBytes);

    console.log('[GenerateVAPIDKeys] Keys generated successfully');
    console.log('[GenerateVAPIDKeys] Public key length:', publicKey.length);

    return new Response(
      JSON.stringify({
        success: true,
        publicKey,
        privateKey,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GenerateVAPIDKeys] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate keys' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Convert ArrayBuffer to URL-safe base64
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
