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
  email: string | null;
  telefones: string;
  telefones_array: string[] | null;
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  socios: any[] | null;
  created_at: string;
  status: string;
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

    // 2. Fetch full lead data
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, cnpj, razao_social, nome_fantasia, email, telefones, telefones_array, endereco, municipio, uf, socios, created_at, status')
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
    
    for (const lead of leads) {
      const payload = {
        event: 'new_lead',
        lead_id: lead.id,
        cnpj: lead.cnpj,
        razao_social: lead.razao_social,
        nome_fantasia: lead.nome_fantasia,
        email: lead.email,
        telefones: lead.telefones_array || (lead.telefones ? lead.telefones.split(',').map((t: string) => t.trim()) : []),
        telefones_string: lead.telefones,
        endereco: lead.endereco,
        municipio: lead.municipio,
        uf: lead.uf,
        socios: lead.socios || [],
        created_at: lead.created_at,
        user_id: user_id,
        timestamp: new Date().toISOString()
      };

      let statusCode = 0;
      let responseBody = '';
      let errorMessage = null;
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

      const duration = Date.now() - startTime;

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
        success_count: successCount,
        fail_count: failCount,
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
