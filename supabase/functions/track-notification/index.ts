/**
 * Track Notification Edge Function
 * 
 * Public endpoint for tracking notification events:
 * - delivered: Service worker received the push
 * - clicked: User clicked the notification
 * - dismissed: User dismissed the notification
 * 
 * Called from client service workers.
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

    // Parse path to determine event type
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const eventType = pathParts[pathParts.length - 1]; // delivered, clicked, dismissed

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { websiteId, notificationId, campaignId, subscriberId, action } = body;

    console.log(`[TrackNotification] Event: ${eventType}`);

    // Input validation - websiteId (required, string, max 100 chars)
    if (!websiteId || typeof websiteId !== 'string' || websiteId.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid websiteId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation - notificationId (required, string, max 100 chars)
    if (!notificationId || typeof notificationId !== 'string' || notificationId.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid notificationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format for campaignId if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (campaignId && (typeof campaignId !== 'string' || !uuidRegex.test(campaignId))) {
      return new Response(
        JSON.stringify({ error: 'Invalid campaignId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format for subscriberId if provided
    if (subscriberId && (typeof subscriberId !== 'string' || !uuidRegex.test(subscriberId))) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscriberId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate action if provided
    if (action && (typeof action !== 'string' || action.length > 100)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate eventType
    if (!['delivered', 'clicked', 'dismissed'].includes(eventType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify notification exists before tracking
    const { data: existingNotification } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('id', notificationId)
      .maybeSingle();

    // If notificationId is a UUID and not found, we should still proceed (it might be a test notification)
    // But log a warning
    if (!existingNotification && uuidRegex.test(notificationId)) {
      console.log(`[TrackNotification] Notification log not found for ID: ${notificationId}, proceeding anyway`);
    }

    const now = new Date().toISOString();
    let updateFields: Record<string, string> = {};

    switch (eventType) {
      case 'delivered':
        updateFields = { status: 'delivered', delivered_at: now };
        break;
      case 'clicked':
        updateFields = { status: 'clicked', clicked_at: now };
        break;
      case 'dismissed':
        updateFields = { status: 'dismissed' };
        break;
    }

    // Update notification log
    const { error: updateError } = await supabase
      .from('notification_logs')
      .update(updateFields)
      .eq('id', notificationId);

    if (updateError) {
      console.error('[TrackNotification] Update error:', updateError);
    }

    // Update campaign stats if campaign ID provided
    if (campaignId) {
      if (eventType === 'delivered') {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('delivered_count')
          .eq('id', campaignId)
          .single();

        if (campaign) {
          await supabase
            .from('campaigns')
            .update({ delivered_count: (campaign.delivered_count || 0) + 1 })
            .eq('id', campaignId);
        }
      } else if (eventType === 'clicked') {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('clicked_count')
          .eq('id', campaignId)
          .single();

        if (campaign) {
          await supabase
            .from('campaigns')
            .update({ clicked_count: (campaign.clicked_count || 0) + 1 })
            .eq('id', campaignId);
        }
      }
    }

    // Update subscriber last active
    if (subscriberId) {
      await supabase
        .from('subscribers')
        .update({ last_active_at: now })
        .eq('id', subscriberId);
    }

    console.log(`[TrackNotification] Successfully tracked ${eventType} event`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TrackNotification] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
