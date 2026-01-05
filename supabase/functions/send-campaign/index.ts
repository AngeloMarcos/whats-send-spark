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

    console.log(`✅ Authenticated user: ${user.id}`);

    const requestBody = await req.json();
    console.error('🔍 REQUEST BODY RECEIVED:', JSON.stringify(requestBody, null, 2));
    
    const { campaignId, webhookUrl, sheetId, sheetTabId, message, sendNow, scheduledAt, sendLimit, isTestMode, testContactPhone } = requestBody;

    console.error('🔍 PARSED PARAMS:', {
      campaignId: campaignId || 'MISSING',
      webhookUrl: webhookUrl ? 'SET' : 'MISSING',
      sendLimit,
      isTestMode,
      testContactPhone: testContactPhone || 'NOT SET',
      timestamp: new Date().toISOString()
    });

    if (!webhookUrl) {
      console.error('❌ webhookUrl is missing!');
      throw new Error("Webhook URL is required");
    }

    // Validate webhook URL against SSRF
    const urlValidation = isValidWebhookUrl(webhookUrl);
    if (!urlValidation.valid) {
      console.error(`❌ Invalid webhook URL rejected: ${webhookUrl} - ${urlValidation.reason}`);
      return new Response(JSON.stringify({ error: `Invalid webhook URL: ${urlValidation.reason}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user owns this campaign and get list_id
    let contacts: Array<Record<string, unknown>> = [];
    
    if (campaignId) {
      console.error('🔍 Fetching campaign data for campaignId:', campaignId);
      
      const { data: campaign, error: campaignError } = await supabaseClient
        .from('campaigns')
        .select('user_id, list_id')
        .eq('id', campaignId)
        .single();
      
      console.error('🔍 CAMPAIGN QUERY RESULT:', {
        campaign: campaign ? JSON.stringify(campaign) : 'NULL',
        error: campaignError ? JSON.stringify(campaignError) : 'NONE',
        timestamp: new Date().toISOString()
      });
      
      if (campaignError || !campaign || campaign.user_id !== user.id) {
        console.error(`❌ User ${user.id} attempted to access campaign ${campaignId} they don't own or campaign not found`);
        console.error('Campaign error details:', campaignError);
        return new Response(JSON.stringify({ error: 'Campaign not found or access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.error('🔍 DEBUG CAMPAIGN:', {
        id: campaignId,
        list_id: campaign.list_id,
        user_id: campaign.user_id,
        timestamp: new Date().toISOString()
      });

      // Validate list_id exists
      if (!campaign.list_id) {
        console.error('❌ ERRO CRÍTICO: campaign.list_id é NULL!');
        console.error('Campaign object completo:', JSON.stringify(campaign));
        return new Response(JSON.stringify({ error: 'Lista de contatos não encontrada para esta campanha' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch contacts from the list
      console.error('🔍 Tentando buscar contatos para list_id:', campaign.list_id);
      
      const { data: contactsData, error: contactsError } = await supabaseClient
        .from('contacts')
        .select('phone, name, email, extra_data')
        .eq('list_id', campaign.list_id)
        .eq('is_valid', true)
        .limit(10000);
      
      console.error('🔍 CONTACTS QUERY RESULT:', {
        contactsCount: contactsData?.length || 0,
        hasError: !!contactsError,
        error: contactsError ? JSON.stringify(contactsError) : 'NONE',
        timestamp: new Date().toISOString()
      });
      
      if (contactsError) {
        console.error('❌ ERRO ao buscar contatos:', JSON.stringify(contactsError));
        return new Response(JSON.stringify({ error: 'Erro ao buscar contatos da lista' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.error('🔍 Contatos encontrados:', contactsData?.length || 0);
      
      if (!contactsData || contactsData.length === 0) {
        console.error(`❌ No valid contacts found for list: ${campaign.list_id}`);
        return new Response(JSON.stringify({ error: 'Nenhum contato válido encontrado na lista' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      contacts = contactsData.map(c => ({
        phone: c.phone,
        name: c.name || 'Lead',
        email: c.email || '',
        ...(c.extra_data as Record<string, unknown> || {})
      }));
      console.error('✅ Contatos mapeados com sucesso:', contacts.length);
    }

    // Normalize and apply send limit
    const sendLimitNum = sendLimit ? parseInt(String(sendLimit), 10) : null;
    const limitedContacts = (sendLimitNum && !isNaN(sendLimitNum) && sendLimitNum > 0)
      ? contacts.slice(0, sendLimitNum) 
      : contacts;

    // If test mode, replace all phones with test contact phone
    const contactsToSend = isTestMode && testContactPhone
      ? limitedContacts.map(c => ({ ...c, phone: testContactPhone }))
      : limitedContacts;

    console.error('🔍 PREPARING FINAL PAYLOAD:', {
      campaignId,
      contactsArrayLength: contacts.length,
      contactsToSendLength: contactsToSend.length,
      limitedContactsLength: limitedContacts.length,
      isTestMode: !!isTestMode,
      hasTestContactPhone: !!testContactPhone,
      sendLimitApplied: sendLimitNum,
      timestamp: new Date().toISOString()
    });

    // Build the payload
    const webhookPayload = {
      campaignId,
      contacts: contactsToSend,
      items: contactsToSend, // Alias for N8N compatibility
      totalContacts: contactsToSend.length,
      message,
      sendNow: sendNow || true,
      scheduledAt: scheduledAt || null,
      sendLimit: sendLimitNum || null,
      isTestMode: isTestMode || false,
      testContactPhone: testContactPhone || null,
      sheetId,
      sheetTabId,
    };

    console.error('🔍 WEBHOOK PAYLOAD STRUCTURE:', {
      hasContacts: Array.isArray(webhookPayload.contacts),
      contactsLength: webhookPayload.contacts?.length || 0,
      hasItems: Array.isArray(webhookPayload.items),
      itemsLength: webhookPayload.items?.length || 0,
      firstContact: webhookPayload.contacts?.[0] ? JSON.stringify(webhookPayload.contacts[0]) : 'EMPTY',
      timestamp: new Date().toISOString()
    });

    console.error(`🚀 Sending ${contactsToSend.length} contacts to webhook: ${webhookUrl}${isTestMode ? ' [TEST MODE]' : ''}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Webhook error:", response.status, errorText);
        return new Response(JSON.stringify({ error: 'Failed to send campaign. Please check your webhook configuration.' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = { success: true };
      }

      console.log("Webhook response:", result);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("Fetch error:", fetchError);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({ error: 'Request timed out. Please try again.' }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to connect to webhook. Please try again.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
