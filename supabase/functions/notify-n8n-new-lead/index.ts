import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyPayload {
  lead_ids: string[];
  user_id: string;
}

interface Lead {
  id: string;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  nome: string | null;
  email: string | null;
  telefones: string;
  telefones_array: string[] | null;
  endereco: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  atividade: string | null;
  situacao: string | null;
  capital_social: string | null;
  porte_empresa: string | null;
  data_abertura: string | null;
  socios: unknown[] | null;
  created_at: string;
  status: string;
  source: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { lead_ids, user_id }: NotifyPayload = await req.json();

    if (!lead_ids || lead_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'lead_ids required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[notify-n8n] Processing ${lead_ids.length} leads for user ${user_id}`);

    // 1. Get user's webhook URL from settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('n8n_webhook_url')
      .eq('user_id', user_id)
      .single();

    if (settingsError || !settings?.n8n_webhook_url) {
      console.log('[notify-n8n] No webhook URL configured for user');
      
      // Log failure for each lead
      for (const lead_id of lead_ids) {
        await supabase.from('webhook_logs').insert({
          user_id,
          lead_id,
          webhook_url: 'NOT_CONFIGURED',
          status_code: null,
          success: false,
          error_message: 'Webhook URL not configured in user settings',
          duration_ms: Date.now() - startTime,
        });
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook URL not configured',
          message: 'Configure a URL do webhook n8n em Configurações' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = settings.n8n_webhook_url;
    console.log(`[notify-n8n] Webhook URL found: ${webhookUrl.substring(0, 50)}...`);

    // Validate webhook URL (basic SSRF protection)
    try {
      const url = new URL(webhookUrl);
      const hostname = url.hostname.toLowerCase();
      
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
      ) {
        throw new Error('Private/localhost URLs not allowed');
      }
    } catch (urlError) {
      console.error('[notify-n8n] Invalid webhook URL:', urlError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid webhook URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch full lead data
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('id', lead_ids);

    if (leadsError || !leads || leads.length === 0) {
      console.error('[notify-n8n] Error fetching leads:', leadsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Leads not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[notify-n8n] Found ${leads.length} leads to notify`);

    // 3. Send each lead to n8n and log results
    const results = [];
    
    for (const lead of leads as Lead[]) {
      const leadStartTime = Date.now();
      
      // Build payload in the exact format expected by n8n Code node "Tratar Dados"
      // Primary fields at root level for easy access
      const payload = {
        // === Primary fields for n8n Code node ===
        lead_id: lead.id,
        user_id: user_id,
        nome: lead.nome_fantasia || lead.razao_social || lead.nome || 'Sem nome',
        telefones: lead.telefones, // Original string format
        created_at: lead.created_at,
        
        // === Complete lead object for reference ===
        lead: {
          id: lead.id,
          cnpj: lead.cnpj,
          razao_social: lead.razao_social,
          nome_fantasia: lead.nome_fantasia,
          nome: lead.nome,
          email: lead.email,
          telefones: lead.telefones,
          telefones_array: lead.telefones_array || [],
          endereco: lead.endereco,
          logradouro: lead.logradouro,
          numero: lead.numero,
          complemento: lead.complemento,
          bairro: lead.bairro,
          municipio: lead.municipio,
          uf: lead.uf,
          cep: lead.cep,
          atividade: lead.atividade,
          situacao: lead.situacao,
          capital_social: lead.capital_social,
          porte_empresa: lead.porte_empresa,
          data_abertura: lead.data_abertura,
          socios: lead.socios || [],
          status: lead.status,
          source: lead.source,
        }
      };

      let statusCode = 0;
      let responseBody = '';
      let errorMessage: string | null = null;
      let success = false;

      try {
        console.log(`[notify-n8n] Sending lead ${lead.id} to webhook...`);
        
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        statusCode = webhookResponse.status;
        responseBody = await webhookResponse.text();
        success = webhookResponse.ok;

        console.log(`[notify-n8n] Lead ${lead.id} - Status: ${statusCode}, Success: ${success}`);
        
        if (!success) {
          errorMessage = `HTTP ${statusCode}: ${responseBody.substring(0, 200)}`;
        }
      } catch (fetchError) {
        errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
        console.error(`[notify-n8n] Lead ${lead.id} - Fetch error:`, errorMessage);
      }

      const duration = Date.now() - leadStartTime;

      // 4. Log the webhook call
      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert({
          user_id: user_id,
          lead_id: lead.id,
          webhook_url: webhookUrl,
          request_payload: payload,
          status_code: statusCode || null,
          response_body: responseBody.substring(0, 1000) || null,
          error_message: errorMessage,
          duration_ms: duration,
          success: success
        });

      if (logError) {
        console.error('[notify-n8n] Error logging webhook call:', logError);
      }

      results.push({
        lead_id: lead.id,
        success,
        status_code: statusCode,
        error: errorMessage
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[notify-n8n] Completed: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total: results.length,
        successful: successCount,
        failed: failCount,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-n8n] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
