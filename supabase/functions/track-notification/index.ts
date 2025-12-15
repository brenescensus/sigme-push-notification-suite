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

    const body = await req.json();
    const { websiteId, notificationId, campaignId, subscriberId, action } = body;

    console.log(`[TrackNotification] Event: ${eventType} for notification:`, notificationId);

    // Validate required fields
    if (!websiteId || !notificationId) {
      return new Response(
        JSON.stringify({ error: 'websiteId and notificationId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    let status: string;
    let updateFields: any = {};

    switch (eventType) {
      case 'delivered':
        status = 'delivered';
        updateFields = { status: 'delivered', delivered_at: now };
        break;
      case 'clicked':
        status = 'clicked';
        updateFields = { status: 'clicked', clicked_at: now };
        break;
      case 'dismissed':
        status = 'dismissed';
        updateFields = { status: 'dismissed' };
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid event type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
