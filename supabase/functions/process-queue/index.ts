import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SSRF protection: validate webhook URL
function isValidWebhookUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    
    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Only HTTPS URLs are allowed' };
    }
    
    const ipv4Regex = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
    const match = parsed.hostname.match(ipv4Regex);
    if (match) {
      const [, a, b, c, d] = match.map(Number);
      if (a === 10 || a === 127 || (a === 169 && b === 254) ||
          (a === 172 && b >= 16 && b <= 31) ||
          (a === 192 && b === 168) || a === 0) {
        return { valid: false, reason: 'Private IP addresses are not allowed' };
      }
    }
    
    const blockedHosts = ['localhost', 'internal', 'local', '127.0.0.1', '0.0.0.0'];
    if (blockedHosts.some(d => parsed.hostname.includes(d))) {
      return { valid: false, reason: 'Internal hostnames are not allowed' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Unauthorized access attempt:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Authenticated user: ${user.id}`);

    const { campaignId, action } = await req.json();

    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'Campaign ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('*, settings:settings!inner(n8n_webhook_url)')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      console.error(`Campaign not found or access denied: ${campaignId}`);
      return new Response(JSON.stringify({ error: 'Campaign not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user settings for webhook URL
    const { data: settings, error: settingsError } = await supabaseClient
      .from('settings')
      .select('n8n_webhook_url')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings?.n8n_webhook_url) {
      return new Response(JSON.stringify({ error: 'Webhook URL not configured in settings' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webhookUrl = settings.n8n_webhook_url;

    // Validate webhook URL
    const urlValidation = isValidWebhookUrl(webhookUrl);
    if (!urlValidation.valid) {
      return new Response(JSON.stringify({ error: `Invalid webhook URL: ${urlValidation.reason}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get test contact if in test mode
    let testContactPhone: string | null = null;
    if (campaign.is_test_mode) {
      const { data: testContact } = await supabaseClient
        .from('test_contacts')
        .select('phone')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();
      
      if (testContact) {
        testContactPhone = testContact.phone;
        console.log(`Test mode active, using test phone: ${testContactPhone}`);
      } else {
        console.warn('Test mode active but no default test contact found');
      }
    }

    // Handle pause action
    if (action === 'pause') {
      console.log(`Pausing campaign ${campaignId}`);
      
      const { error: updateError } = await supabaseClient
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId);

      if (updateError) {
        console.error('Error pausing campaign:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to pause campaign' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        status: 'paused',
        message: 'Campanha pausada com sucesso'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle resume action
    if (action === 'resume') {
      console.log(`Resuming campaign ${campaignId}`);
      
      const { error: updateError } = await supabaseClient
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', campaignId);

      if (updateError) {
        console.error('Error resuming campaign:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to resume campaign' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        status: 'sending',
        message: 'Campanha retomada com sucesso'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different actions
    if (action === 'process_next') {
      // Check if campaign is paused before processing
      if (campaign.status === 'paused') {
        console.log(`Campaign ${campaignId} is paused, not processing`);
        return new Response(JSON.stringify({ 
          paused: true,
          message: 'Campanha está pausada'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const startTime = Date.now();

      // Get next pending contact from queue
      const { data: nextContact, error: queueError } = await supabaseClient
        .from('campaign_queue')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (queueError || !nextContact) {
        // No more contacts to process
        console.log(`No pending contacts for campaign ${campaignId}`);
        
        // Update campaign status to completed
        await supabaseClient
          .from('campaigns')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', campaignId);

        return new Response(JSON.stringify({ 
          done: true, 
          message: 'All contacts processed' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Processing contact ${nextContact.id} for campaign ${campaignId}`);

      // DOUBLE CHECK #1: Verify current status is still 'pending' (race condition protection)
      const { data: currentStatus, error: statusError } = await supabaseClient
        .from('campaign_queue')
        .select('status')
        .eq('id', nextContact.id)
        .single();

      if (statusError || currentStatus?.status !== 'pending') {
        console.log(`Contact ${nextContact.id} already processed (status: ${currentStatus?.status}), skipping`);
        // Get remaining count and return to let client try next
        const { count } = await supabaseClient
          .from('campaign_queue')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
          .eq('status', 'pending');

        return new Response(JSON.stringify({ 
          done: (count || 0) === 0,
          skipped: true,
          reason: 'already_processed',
          remainingCount: count || 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // DOUBLE CHECK #2: Check if there's already a 'sent' record for this phone in this campaign
      const { data: alreadySent, error: dupError } = await supabaseClient
        .from('campaign_queue')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('contact_phone', nextContact.contact_phone)
        .eq('status', 'sent')
        .limit(1);

      if (!dupError && alreadySent && alreadySent.length > 0) {
        console.log(`Contact ${nextContact.contact_phone} already sent in this campaign, marking as skipped`);
        
        // Mark as skipped
        await supabaseClient
          .from('campaign_queue')
          .update({ 
            status: 'skipped', 
            error_message: 'Duplicado - já enviado nesta campanha' 
          })
          .eq('id', nextContact.id);

        // Get remaining count
        const { count } = await supabaseClient
          .from('campaign_queue')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
          .eq('status', 'pending');

        return new Response(JSON.stringify({ 
          done: (count || 0) === 0,
          skipped: {
            id: nextContact.id,
            name: nextContact.contact_name,
            phone: nextContact.contact_phone,
            reason: 'duplicate',
          },
          remainingCount: count || 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Determine phone to send to (test mode redirects to test contact)
      const phoneToSend = testContactPhone || nextContact.contact_phone;

      // Send to webhook
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            contact: {
              name: nextContact.contact_name,
              phone: phoneToSend, // Use test phone if in test mode
              originalPhone: nextContact.contact_phone, // Keep original for reference
              ...nextContact.contact_data,
            },
            message: campaign.message,
            isTestMode: campaign.is_test_mode,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Webhook returned ${response.status}`);
        }

        const processingTime = Date.now() - startTime;

        // Mark as sent
        await supabaseClient
          .from('campaign_queue')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', nextContact.id);

        // Update campaign counters
        await supabaseClient
          .from('campaigns')
          .update({ 
            contacts_sent: (campaign.contacts_sent || 0) + 1 
          })
          .eq('id', campaignId);

        // Insert log for real-time monitoring
        await supabaseClient
          .from('campaign_logs')
          .insert({
            campaign_id: campaignId,
            contact_phone: nextContact.contact_phone,
            contact_name: nextContact.contact_name,
            status: 'sent',
            message_sent: campaign.message,
            processing_time_ms: processingTime,
            is_test: campaign.is_test_mode || false,
            sent_at: new Date().toISOString(),
          });

        console.log(`Contact ${nextContact.id} sent successfully (${processingTime}ms)`);

        // Get remaining count
        const { count } = await supabaseClient
          .from('campaign_queue')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
          .eq('status', 'pending');

        return new Response(JSON.stringify({ 
          done: false,
          sent: {
            id: nextContact.id,
            name: nextContact.contact_name,
            phone: nextContact.contact_phone,
          },
          remainingCount: count || 0,
          sentCount: (campaign.contacts_sent || 0) + 1,
          processingTime,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (sendError) {
        const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error';
        const processingTime = Date.now() - startTime;
        console.error(`Error sending contact ${nextContact.id}:`, errorMessage);

        // Mark as error
        await supabaseClient
          .from('campaign_queue')
          .update({ 
            status: 'error', 
            error_message: errorMessage 
          })
          .eq('id', nextContact.id);

        // Update campaign counters
        await supabaseClient
          .from('campaigns')
          .update({ 
            contacts_failed: (campaign.contacts_failed || 0) + 1 
          })
          .eq('id', campaignId);

        // Insert error log for real-time monitoring
        await supabaseClient
          .from('campaign_logs')
          .insert({
            campaign_id: campaignId,
            contact_phone: nextContact.contact_phone,
            contact_name: nextContact.contact_name,
            status: 'error',
            message_sent: campaign.message,
            error_message: errorMessage,
            processing_time_ms: processingTime,
            is_test: campaign.is_test_mode || false,
            sent_at: new Date().toISOString(),
          });

        // Get remaining count
        const { count } = await supabaseClient
          .from('campaign_queue')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
          .eq('status', 'pending');

        return new Response(JSON.stringify({ 
          done: false,
          error: {
            id: nextContact.id,
            name: nextContact.contact_name,
            phone: nextContact.contact_phone,
            message: errorMessage,
          },
          remainingCount: count || 0,
          failedCount: (campaign.contacts_failed || 0) + 1,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get queue status
    if (action === 'status') {
      const { data: queueItems, error: queueError } = await supabaseClient
        .from('campaign_queue')
        .select('status')
        .eq('campaign_id', campaignId);

      if (queueError) {
        throw queueError;
      }

      const pending = queueItems?.filter(i => i.status === 'pending').length || 0;
      const sent = queueItems?.filter(i => i.status === 'sent').length || 0;
      const error = queueItems?.filter(i => i.status === 'error').length || 0;

      return new Response(JSON.stringify({ 
        total: queueItems?.length || 0,
        pending,
        sent,
        error,
        intervalMinutes: campaign.send_interval_minutes || 5,
        isTestMode: campaign.is_test_mode || false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
