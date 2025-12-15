/**
 * Register Subscriber Edge Function
 * 
 * Public endpoint for registering push notification subscribers.
 * Called from client websites via the integration script.
 * 
 * Handles:
 * - Web Push subscriptions
 * - Device detection
 * - Geolocation (basic)
 * - Duplicate prevention
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { websiteId, subscription, userAgent, language, timezone, fcmToken, apnsToken } = body;

    console.log('[RegisterSubscriber] Received request for website:', websiteId);

    // Validate required fields
    if (!websiteId) {
      return new Response(
        JSON.stringify({ error: 'websiteId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify website exists
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, status')
      .eq('id', websiteId)
      .maybeSingle();

    if (websiteError || !website) {
      console.error('[RegisterSubscriber] Website not found:', websiteId);
      return new Response(
        JSON.stringify({ error: 'Invalid website' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse user agent for device info
    const deviceInfo = parseUserAgent(userAgent || '');
    
    // Determine platform
    let platform = 'web';
    if (fcmToken) platform = 'android';
    if (apnsToken) platform = 'ios';

    // Build subscriber record
    const subscriberData: any = {
      website_id: websiteId,
      browser: deviceInfo.browser,
      browser_version: deviceInfo.browserVersion,
      device_type: deviceInfo.deviceType,
      os: deviceInfo.os,
      platform,
      language: language || null,
      timezone: timezone || null,
      status: 'active',
      last_active_at: new Date().toISOString(),
    };

    // Add Web Push subscription data
    if (subscription) {
      subscriberData.endpoint = subscription.endpoint;
      subscriberData.p256dh_key = subscription.keys?.p256dh || '';
      subscriberData.auth_key = subscription.keys?.auth || '';
    }

    // Add FCM/APNs tokens
    if (fcmToken) subscriberData.fcm_token = fcmToken;
    if (apnsToken) subscriberData.apns_token = apnsToken;

    // Validate we have at least one subscription method
    if (!subscriberData.endpoint && !fcmToken && !apnsToken) {
      return new Response(
        JSON.stringify({ error: 'No valid subscription provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert subscriber (update if exists, insert if new)
    const { data: subscriber, error: insertError } = await supabase
      .from('subscribers')
      .upsert(subscriberData, {
        onConflict: 'website_id,endpoint',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[RegisterSubscriber] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to register subscriber' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[RegisterSubscriber] Subscriber registered:', subscriber.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscriberId: subscriber.id,
        message: 'Subscriber registered successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RegisterSubscriber] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Parse user agent to extract device info
function parseUserAgent(ua: string): {
  browser: string;
  browserVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  os: string;
} {
  let browser = 'Unknown';
  let browserVersion = '';
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  let os = 'Unknown';

  // Detect browser
  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
    browserVersion = ua.match(/Version\/(\d+)/)?.[1] || '';
  }

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Detect device type
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    deviceType = 'mobile';
  } else if (ua.includes('Tablet') || ua.includes('iPad')) {
    deviceType = 'tablet';
  }

  return { browser, browserVersion, deviceType, os };
}
