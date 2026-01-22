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
  retry_count: number | null;
}

// ============================================================
// Helper: Traduz erros HTTP para mensagens amigáveis em PT-BR
// ============================================================
function translateErrorMessage(statusCode: number, responseBody: string): string {
  // Casos específicos do n8n
  if (statusCode === 404) {
    if (responseBody.includes('workflow must be active') || 
        responseBody.includes('not registered') ||
        responseBody.includes('The requested webhook')) {
      return 'O workflow do n8n não está ativo. Ative-o no editor do n8n e use a Production URL.';
    }
    return 'Webhook não encontrado. Verifique se a URL está correta.';
  }
  
  if (statusCode === 401 || statusCode === 403) {
    return 'Erro de autenticação no webhook. Verifique as credenciais.';
  }
  
  if (statusCode >= 500) {
    return 'Erro temporário no servidor n8n. Tente novamente em alguns minutos.';
  }
  
  if (statusCode >= 400) {
    return `Erro na requisição (HTTP ${statusCode}). Verifique a configuração do webhook.`;
  }
  
  return `Resposta inesperada do servidor (HTTP ${statusCode}).`;
}

// ============================================================
// Helper: Valida URL para prevenir SSRF
// ============================================================
function validateWebhookUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Bloquear localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return { valid: false, error: 'URLs locais (localhost) não são permitidas.' };
    }
    
    // Bloquear ranges de IP privados
    if (hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return { valid: false, error: 'URLs de redes privadas não são permitidas.' };
    }
    
    // Exigir HTTPS (exceto para testes locais que já foram bloqueados)
    if (url.protocol !== 'https:') {
      return { valid: false, error: 'A URL deve usar HTTPS para segurança.' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'URL inválida.' };
  }
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

    // ============================================================
    // 1. Buscar URL do webhook nas configurações do usuário
    // ============================================================
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('n8n_webhook_url')
      .eq('user_id', user_id)
      .single();

    if (settingsError || !settings?.n8n_webhook_url) {
      console.log('[notify-n8n] No webhook URL configured for user');
      
      const errorMsg = 'Configure a URL do webhook n8n em Configurações antes de enviar leads.';
      
      // Log failure for each lead
      for (const lead_id of lead_ids) {
        await supabase.from('webhook_logs').insert({
          user_id,
          lead_id,
          webhook_url: 'NOT_CONFIGURED',
          status_code: null,
          success: false,
          error_message: errorMsg,
          duration_ms: Date.now() - startTime,
        });
      }
      
      // Atualizar status do último erro nas settings
      await supabase.from('settings').update({
        n8n_webhook_last_status: null,
        n8n_webhook_last_error: errorMsg,
        n8n_webhook_last_called_at: new Date().toISOString(),
      }).eq('user_id', user_id);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook URL not configured',
          message: errorMsg
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = settings.n8n_webhook_url;
    console.log(`[notify-n8n] Webhook URL found: ${webhookUrl.substring(0, 50)}...`);

    // ============================================================
    // 2. Validar URL do webhook (proteção SSRF)
    // ============================================================
    const urlValidation = validateWebhookUrl(webhookUrl);
    if (!urlValidation.valid) {
      console.error('[notify-n8n] Invalid webhook URL:', urlValidation.error);
      
      await supabase.from('settings').update({
        n8n_webhook_last_status: null,
        n8n_webhook_last_error: urlValidation.error,
        n8n_webhook_last_called_at: new Date().toISOString(),
      }).eq('user_id', user_id);
      
      return new Response(
        JSON.stringify({ success: false, error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // 3. Buscar dados completos dos leads
    // ============================================================
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

    // ============================================================
    // 4. Enviar cada lead para o n8n e registrar resultados
    // ============================================================
    const results = [];
    let lastStatusCode: number | null = null;
    let lastErrorMessage: string | null = null;
    
    for (const lead of leads as Lead[]) {
      const leadStartTime = Date.now();
      
      // Montar payload compatível com o Code node "Tratar Dados" do n8n
      const payload = {
        // === Campos principais para acesso direto no n8n ===
        lead_id: lead.id,
        user_id: user_id,
        nome: lead.nome_fantasia || lead.razao_social || lead.nome || 'Sem nome',
        telefones: lead.telefones, // String original
        created_at: lead.created_at,
        
        // === Objeto completo do lead para referência ===
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
        
        // Criar AbortController para timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          statusCode = webhookResponse.status;
          responseBody = await webhookResponse.text();
          success = webhookResponse.ok;

          console.log(`[notify-n8n] Lead ${lead.id} - Status: ${statusCode}, Success: ${success}`);
          
          if (!success) {
            // Traduzir erro para mensagem amigável
            errorMessage = translateErrorMessage(statusCode, responseBody);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          
          if (fetchError instanceof Error) {
            if (fetchError.name === 'AbortError') {
              errorMessage = 'O webhook demorou muito para responder (timeout de 10s). Verifique se o servidor está acessível.';
            } else if (fetchError.message.includes('fetch failed') || fetchError.message.includes('network')) {
              errorMessage = 'Não foi possível conectar ao servidor n8n. Verifique se a URL está acessível.';
            } else {
              errorMessage = `Erro de conexão: ${fetchError.message}`;
            }
          } else {
            errorMessage = 'Erro desconhecido ao conectar com o webhook.';
          }
          console.error(`[notify-n8n] Lead ${lead.id} - Fetch error:`, errorMessage);
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`[notify-n8n] Lead ${lead.id} - Unexpected error:`, errorMessage);
      }

      const duration = Date.now() - leadStartTime;
      
      // Guardar último status para atualizar settings
      lastStatusCode = statusCode || null;
      lastErrorMessage = errorMessage;

      // ============================================================
      // 5. Registrar log do webhook
      // ============================================================
      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert({
          user_id: user_id,
          lead_id: lead.id,
          webhook_url: webhookUrl,
          request_payload: payload,
          status_code: statusCode || null,
          response_body: responseBody.substring(0, 2000) || null,
          error_message: errorMessage,
          duration_ms: duration,
          success: success
        });

      if (logError) {
        console.error('[notify-n8n] Error logging webhook call:', logError);
      }

      // ============================================================
      // 6. Atualizar retry_count do lead
      // ============================================================
      const currentRetryCount = lead.retry_count || 0;
      await supabase
        .from('leads')
        .update({ 
          retry_count: currentRetryCount + 1,
          last_webhook_attempt: new Date().toISOString()
        })
        .eq('id', lead.id);

      results.push({
        lead_id: lead.id,
        success,
        status_code: statusCode,
        error: errorMessage
      });
    }

    // ============================================================
    // 7. Atualizar status do webhook nas settings do usuário
    // ============================================================
    await supabase.from('settings').update({
      n8n_webhook_last_status: lastStatusCode,
      n8n_webhook_last_error: lastErrorMessage,
      n8n_webhook_last_called_at: new Date().toISOString(),
    }).eq('user_id', user_id);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[notify-n8n] Completed: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total: results.length,
        successful: successCount,
        failed: failCount,
        success_count: successCount, // Alias para compatibilidade
        fail_count: failCount,       // Alias para compatibilidade
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-n8n] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
