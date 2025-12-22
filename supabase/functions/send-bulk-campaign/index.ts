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
    
    // Only allow https (not http) for security
    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Only HTTPS URLs are allowed' };
    }
    
    // Block private IP ranges (SSRF prevention)
    const ipv4Regex = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/;
    const match = parsed.hostname.match(ipv4Regex);
    if (match) {
      const [, a, b, c, d] = match.map(Number);
      // Block: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
      if (a === 10 || a === 127 || (a === 169 && b === 254) ||
          (a === 172 && b >= 16 && b <= 31) ||
          (a === 192 && b === 168) || a === 0) {
        return { valid: false, reason: 'Private IP addresses are not allowed' };
      }
    }
    
    // Block localhost and common internal domains
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
    // Authentication check
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

    const { campaignId, contacts, message, webhookUrl, sendNow, scheduledAt, sendLimit } = await req.json();

    if (!webhookUrl) {
      throw new Error("Webhook URL is required");
    }

    // Validate webhook URL against SSRF
    const urlValidation = isValidWebhookUrl(webhookUrl);
    if (!urlValidation.valid) {
      console.error(`Invalid webhook URL rejected: ${webhookUrl} - ${urlValidation.reason}`);
      return new Response(JSON.stringify({ error: `Invalid webhook URL: ${urlValidation.reason}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      throw new Error("Contacts array is required and cannot be empty");
    }

    // Limit contacts array size to prevent abuse
    if (contacts.length > 10000) {
      return new Response(JSON.stringify({ error: 'Too many contacts (max 10000)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user owns this campaign
    if (campaignId) {
      const { data: campaign, error: campaignError } = await supabaseClient
        .from('campaigns')
        .select('user_id')
        .eq('id', campaignId)
        .single();
      
      if (campaignError || !campaign || campaign.user_id !== user.id) {
        console.error(`User ${user.id} attempted to access campaign ${campaignId} they don't own`);
        return new Response(JSON.stringify({ error: 'Campaign not found or access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Sending bulk campaign ${campaignId} with ${contacts.length} contacts to webhook: ${webhookUrl}`);

    // Apply send limit if specified
    const contactsToSend = sendLimit ? contacts.slice(0, sendLimit) : contacts;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for bulk

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          contacts: contactsToSend,
          message,
          sendNow,
          scheduledAt,
          sendLimit,
          totalContacts: contactsToSend.length,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Webhook error:", response.status, errorText);
        throw new Error(`Webhook returned ${response.status}: ${errorText}`);
      }

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = { success: true };
      }

      console.log("Webhook response:", result);

      return new Response(JSON.stringify({ 
        ...result, 
        contactsSent: contactsToSend.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Webhook request timed out');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
