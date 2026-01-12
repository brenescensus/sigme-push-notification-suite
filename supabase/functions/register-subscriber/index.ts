/**
 * Register Subscriber Edge Function
 * 
 * Public endpoint for registering push notification subscribers.
 * Called from client websites via the integration script/service worker.
 * 
 * Handles:
 * - Web Push subscriptions
 * - Device detection (browser, OS, device type)
 * - Duplicate prevention via upsert
 * - Automatic subscription updates
 * 
 * REFACTORED: Improved logging, error handling, and supports
 * both nested and flat subscription formats.
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

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[RegisterSubscriber] Received request');

    const { 
      websiteId, 
      subscription, 
      userAgent, 
      language, 
      timezone, 
      fcmToken, 
      apnsToken,
      // Also accept flat fields from SW
      browser: providedBrowser,
      browserVersion: providedBrowserVersion,
      deviceType: providedDeviceType,
      os: providedOs,
      platform: providedPlatform
    } = body;

    // Input validation - websiteId (required, string, max 100 chars)
    if (!websiteId || typeof websiteId !== 'string' || websiteId.length > 100) {
      console.error('[RegisterSubscriber] Invalid websiteId');
      return new Response(
        JSON.stringify({ error: 'Invalid websiteId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation - subscription object
    if (subscription) {
      if (typeof subscription !== 'object') {
        return new Response(
          JSON.stringify({ error: 'Invalid subscription format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (subscription.endpoint && (typeof subscription.endpoint !== 'string' || subscription.endpoint.length > 2000)) {
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (subscription.keys) {
        if (typeof subscription.keys !== 'object') {
          return new Response(
            JSON.stringify({ error: 'Invalid subscription keys' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (subscription.keys.p256dh && (typeof subscription.keys.p256dh !== 'string' || subscription.keys.p256dh.length > 500)) {
          return new Response(
            JSON.stringify({ error: 'Invalid p256dh key' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (subscription.keys.auth && (typeof subscription.keys.auth !== 'string' || subscription.keys.auth.length > 500)) {
          return new Response(
            JSON.stringify({ error: 'Invalid auth key' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Input validation - optional string fields (max lengths)
    if (userAgent && (typeof userAgent !== 'string' || userAgent.length > 1000)) {
      return new Response(
        JSON.stringify({ error: 'Invalid userAgent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (language && (typeof language !== 'string' || language.length > 50)) {
      return new Response(
        JSON.stringify({ error: 'Invalid language' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (timezone && (typeof timezone !== 'string' || timezone.length > 100)) {
      return new Response(
        JSON.stringify({ error: 'Invalid timezone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (fcmToken && (typeof fcmToken !== 'string' || fcmToken.length > 500)) {
      return new Response(
        JSON.stringify({ error: 'Invalid fcmToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (apnsToken && (typeof apnsToken !== 'string' || apnsToken.length > 500)) {
      return new Response(
        JSON.stringify({ error: 'Invalid apnsToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (providedBrowser && (typeof providedBrowser !== 'string' || providedBrowser.length > 100)) {
      return new Response(
        JSON.stringify({ error: 'Invalid browser' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (providedBrowserVersion && (typeof providedBrowserVersion !== 'string' || providedBrowserVersion.length > 50)) {
      return new Response(
        JSON.stringify({ error: 'Invalid browserVersion' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (providedDeviceType && !['desktop', 'mobile', 'tablet'].includes(providedDeviceType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid deviceType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (providedOs && (typeof providedOs !== 'string' || providedOs.length > 100)) {
      return new Response(
        JSON.stringify({ error: 'Invalid os' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (providedPlatform && !['web', 'android', 'ios'].includes(providedPlatform)) {
      return new Response(
        JSON.stringify({ error: 'Invalid platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify website exists and is active
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
    
    // Check website is active enough to accept subscribers.
    // NOTE: We allow `pending` websites to register subscribers so the setup flow works
    // before verification is completed. This does NOT generate or rotate any VAPID keys.
    if (!['active', 'pending'].includes(website.status)) {
      console.error('[RegisterSubscriber] Website not accepting subscribers:', websiteId, 'status:', website.status);
      return new Response(
        JSON.stringify({ error: 'Website not accepting subscribers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse user agent for device info (fallback if not provided)
    const deviceInfo = parseUserAgent(userAgent || '');
    
    // Determine platform
    let platform = providedPlatform || 'web';
    if (fcmToken) platform = 'android';
    if (apnsToken) platform = 'ios';

    // Build subscriber record
    const subscriberData: Record<string, unknown> = {
      website_id: websiteId,
      browser: providedBrowser || deviceInfo.browser,
      browser_version: providedBrowserVersion || deviceInfo.browserVersion,
      device_type: providedDeviceType || deviceInfo.deviceType,
      os: providedOs || deviceInfo.os,
      platform,
      language: language || null,
      timezone: timezone || null,
      status: 'active',
      last_active_at: new Date().toISOString(),
    };

    // Add Web Push subscription data
    // Support both nested (subscription.endpoint) and flat (endpoint) formats
    if (subscription) {
      subscriberData.endpoint = subscription.endpoint;
      // Support both subscription.keys.p256dh and subscription.keys format
      if (subscription.keys) {
        subscriberData.p256dh_key = subscription.keys.p256dh || '';
        subscriberData.auth_key = subscription.keys.auth || '';
      }
    }

    // Add FCM/APNs tokens
    if (fcmToken) subscriberData.fcm_token = fcmToken;
    if (apnsToken) subscriberData.apns_token = apnsToken;

    // Validate we have at least one subscription method
    if (!subscriberData.endpoint && !fcmToken && !apnsToken) {
      console.error('[RegisterSubscriber] No valid subscription provided');
      return new Response(
        JSON.stringify({ error: 'No valid subscription provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[RegisterSubscriber] Upserting subscriber:', {
      website_id: subscriberData.website_id,
      endpoint: (subscriberData.endpoint as string)?.substring(0, 50) + '...',
      browser: subscriberData.browser,
      device_type: subscriberData.device_type
    });

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
      console.error('[RegisterSubscriber] Upsert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to register subscriber', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[RegisterSubscriber] Subscriber registered successfully:', subscriber.id);

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
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
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

  // Detect browser (order matters - Edge includes Chrome, Safari includes Chrome in some UAs)
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
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
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
