/**
 * Process Scheduled Campaigns Edge Function
 * 
 * Triggered by pg_cron to process scheduled and recurring campaigns.
 * Finds campaigns that are due and triggers the send-notification function.
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // This function should only be called by pg_cron or with the service role key
    // Validate that the request has proper authorization
    const authHeader = req.headers.get('authorization');
    
    // Check if called with service role key (from pg_cron or internal calls)
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      // Only allow service role key (used by pg_cron and internal edge function calls)
      if (token !== supabaseServiceKey) {
        console.error('[ProcessScheduled] Unauthorized - invalid token');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // No auth header - reject request
      console.error('[ProcessScheduled] Unauthorized - no auth header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ProcessScheduled] Authorized request received');

    console.log('[ProcessScheduled] Starting scheduled campaign check...');

    const now = new Date().toISOString();

    // Find scheduled campaigns that are due
    const { data: scheduledCampaigns, error: scheduledError } = await supabase
      .from('campaigns')
      .select('*, websites!inner(vapid_public_key, vapid_private_key, url)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (scheduledError) {
      console.error('[ProcessScheduled] Error fetching scheduled campaigns:', scheduledError);
      throw scheduledError;
    }

    // Find recurring campaigns that are due
    const { data: recurringCampaigns, error: recurringError } = await supabase
      .from('campaigns')
      .select('*, websites!inner(vapid_public_key, vapid_private_key, url)')
      .eq('status', 'recurring')
      .eq('is_recurring', true)
      .lte('next_send_at', now);

    if (recurringError) {
      console.error('[ProcessScheduled] Error fetching recurring campaigns:', recurringError);
      throw recurringError;
    }

    const allCampaigns = [
      ...(scheduledCampaigns || []),
      ...(recurringCampaigns || []),
    ];

    console.log(`[ProcessScheduled] Found ${allCampaigns.length} campaigns to process`);

    let processed = 0;
    let failed = 0;

    for (const campaign of allCampaigns) {
      try {
        console.log(`[ProcessScheduled] Processing campaign: ${campaign.id} - ${campaign.name}`);

        // Call send-notification function
        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            campaignId: campaign.id,
            websiteId: campaign.website_id,
            notification: {
              title: campaign.title,
              body: campaign.body,
              icon: campaign.icon_url,
              image: campaign.image_url,
              url: campaign.click_url,
              actions: campaign.actions,
              notificationId: campaign.id,
            },
          }),
        });

        const sendResult = await sendResponse.json();
        console.log(`[ProcessScheduled] Campaign ${campaign.id} result:`, sendResult);

        // Update campaign status
        if (campaign.is_recurring) {
          // Calculate next send time for recurring campaigns
          const nextSendAt = calculateNextSendTime(campaign.recurrence_config);
          
          await supabase
            .from('campaigns')
            .update({
              next_send_at: nextSendAt,
              updated_at: new Date().toISOString(),
            })
            .eq('id', campaign.id);
        } else {
          // Mark one-time scheduled campaign as completed
          await supabase
            .from('campaigns')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', campaign.id);
        }

        processed++;
      } catch (err) {
        console.error(`[ProcessScheduled] Failed to process campaign ${campaign.id}:`, err);
        failed++;
      }
    }

    console.log(`[ProcessScheduled] Done: ${processed} processed, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: allCampaigns.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ProcessScheduled] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Calculate next send time based on recurrence config
function calculateNextSendTime(config: any): string {
  if (!config) {
    // Default to next day at same time
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  const now = new Date();
  let next = new Date();

  // Parse time if provided (HH:MM format)
  const time = config.recurringTime || "09:00";
  const [hours, minutes] = time.split(':').map(Number);

  switch (config.recurringInterval) {
    case 'daily':
      next.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(now.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(now.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(now.getMonth() + 1);
      break;
    default:
      next.setDate(now.getDate() + 1);
  }

  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}
