import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Get greeting based on current hour (Brazil timezone)
function getSaudacao(): string {
  const now = new Date();
  const brasilOffset = -3; // UTC-3
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brasilTime = new Date(utc + (3600000 * brasilOffset));
  const hour = brasilTime.getHours();
  
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Helper: Check if within business hours (08h-20h, Mon-Sat)
function isWithinBusinessHours(): boolean {
  const now = new Date();
  const brasilOffset = -3;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brasilTime = new Date(utc + (3600000 * brasilOffset));
  
  const hour = brasilTime.getHours();
  const dayOfWeek = brasilTime.getDay(); // 0 = Sunday
  
  // Not on Sunday
  if (dayOfWeek === 0) return false;
  
  // Between 08:00 and 20:00
  return hour >= 8 && hour < 20;
}

// Helper: Validate phone number (11+ digits)
function isValidPhone(phone: string | null): boolean {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 11 && digitsOnly.length <= 15;
}

// Helper: Format phone for API
function formatPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  // Add country code if missing
  if (digitsOnly.length === 11) {
    return `55${digitsOnly}`;
  }
  return digitsOnly;
}

// Helper: Replace template variables
function processTemplate(template: string, lead: Record<string, unknown>, campaignName?: string): string {
  let message = template;
  
  // Standard variables
  message = message.replace(/\{\{razao_social\}\}/g, String(lead.razao_social || lead.nome || 'Empresa'));
  message = message.replace(/\{\{nome\}\}/g, String(lead.nome || lead.razao_social || 'Cliente'));
  message = message.replace(/\{\{cnpj\}\}/g, String(lead.cnpj || ''));
  message = message.replace(/\{\{email\}\}/g, String(lead.email || ''));
  message = message.replace(/\{\{data_captura\}\}/g, lead.created_at ? new Date(String(lead.created_at)).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'));
  message = message.replace(/\{\{campanha\}\}/g, campaignName || 'Campanha');
  message = message.replace(/\{\{saudacao\}\}/g, getSaudacao());
  message = message.replace(/\{\{atividade\}\}/g, String(lead.atividade || ''));
  message = message.replace(/\{\{municipio\}\}/g, String(lead.municipio || ''));
  message = message.replace(/\{\{uf\}\}/g, String(lead.uf || ''));
  message = message.replace(/\{\{bairro\}\}/g, String(lead.bairro || ''));
  
  return message;
}

interface LeadDispatchPayload {
  event: 'new_lead_active' | 'status_changed_to_ativa' | 'manual_dispatch';
  lead_id?: string;
  campaign_id?: string;
  template_id?: string;
  user_id?: string;
  webhook_url?: string;
  message_template?: string;
  filters?: {
    status?: string;
    only_with_phone?: boolean;
    exclude_blacklist?: boolean;
    limit?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  try {
    // Verify authentication first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create auth client to verify the user's token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth verification failed:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized - invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authenticatedUserId = claimsData.claims.sub;
    console.log('Authenticated user:', authenticatedUserId);

    // Parse the payload
    const payload: LeadDispatchPayload = await req.json();
    console.log('Received dispatch request:', JSON.stringify(payload, null, 2));

    const { 
      event, 
      lead_id, 
      campaign_id, 
      template_id, 
      user_id,
      webhook_url,
      message_template,
      filters 
    } = payload;

    // Validate required fields
    if (!event) {
      return new Response(JSON.stringify({ error: 'Event type is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Verify that the authenticated user matches the requested user_id
    if (authenticatedUserId !== user_id) {
      console.error('User mismatch: authenticated user', authenticatedUserId, 'tried to access user_id', user_id);
      return new Response(JSON.stringify({ error: 'Forbidden - cannot access other user data' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Now use service role for database operations (authenticated user is verified)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check business hours unless it's a test/manual dispatch
    if (event !== 'manual_dispatch' && !isWithinBusinessHours()) {
      console.log('Outside business hours, queueing for later');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Fora do horário comercial (08h-20h, seg-sáb). Mensagem será agendada.',
        queued: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's webhook URL from settings if not provided
    let finalWebhookUrl = webhook_url;
    if (!finalWebhookUrl) {
      const { data: settings } = await supabase
        .from('settings')
        .select('n8n_webhook_url')
        .eq('user_id', user_id)
        .single();
      
      finalWebhookUrl = settings?.n8n_webhook_url;
    }

    if (!finalWebhookUrl) {
      return new Response(JSON.stringify({ error: 'Webhook URL não configurado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get leads to process
    let leadsQuery = supabase
      .from('leads')
      .select('*')
      .eq('user_id', user_id);

    // Apply filters
    if (lead_id) {
      leadsQuery = leadsQuery.eq('id', lead_id);
    } else {
      // Default: only active leads
      leadsQuery = leadsQuery.eq('situacao', filters?.status || 'ATIVA');
      
      // Exclude blocked leads
      leadsQuery = leadsQuery.eq('bloqueado', false);
      
      // Limit results
      if (filters?.limit) {
        leadsQuery = leadsQuery.limit(filters.limit);
      } else {
        leadsQuery = leadsQuery.limit(100); // Default limit
      }
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar leads' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum lead encontrado para processar',
        processed: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${leads.length} leads to process`);

    // Get blacklist for filtering
    const { data: blacklist } = await supabase
      .from('blacklist')
      .select('phone_number')
      .eq('user_id', user_id);
    
    const blacklistPhones = new Set(blacklist?.map(b => b.phone_number.replace(/\D/g, '')) || []);

    // Get template if template_id provided
    let template = message_template;
    let campaignName = 'Campanha';
    
    if (template_id) {
      const { data: templateData } = await supabase
        .from('templates')
        .select('content, name')
        .eq('id', template_id)
        .single();
      
      if (templateData) {
        template = templateData.content;
      }
    }

    if (campaign_id) {
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('name, message')
        .eq('id', campaign_id)
        .single();
      
      if (campaignData) {
        campaignName = campaignData.name;
        if (!template) template = campaignData.message;
      }
    }

    if (!template) {
      return new Response(JSON.stringify({ error: 'Template de mensagem não encontrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process leads
    const results: Array<{
      lead_id: string;
      phone: string;
      status: string;
      message_id?: string;
      error?: string;
    }> = [];

    for (const lead of leads) {
      // Extract phone from leads (can be in telefones or telefones_array)
      let phone = lead.telefones;
      if (!phone && Array.isArray(lead.telefones_array) && lead.telefones_array.length > 0) {
        phone = String(lead.telefones_array[0]);
      }

      // Validate phone
      if (!isValidPhone(phone)) {
        results.push({
          lead_id: lead.id,
          phone: phone || 'N/A',
          status: 'invalid_phone',
          error: 'Telefone inválido'
        });
        
        // Log invalid phone
        await supabase.from('message_logs').insert({
          lead_id: lead.id,
          phone_number: phone,
          status: 'failed',
          error_message: 'Telefone inválido (menos de 11 dígitos)',
          campaign_id,
          template_id,
          user_id
        });
        
        continue;
      }

      const formattedPhone = formatPhone(phone);
      
      // Check blacklist
      if (blacklistPhones.has(formattedPhone.replace(/^55/, ''))) {
        results.push({
          lead_id: lead.id,
          phone: formattedPhone,
          status: 'blacklisted',
          error: 'Número na blacklist'
        });
        
        await supabase.from('message_logs').insert({
          lead_id: lead.id,
          phone_number: formattedPhone,
          status: 'failed',
          error_message: 'Número na blacklist',
          campaign_id,
          template_id,
          user_id
        });
        
        continue;
      }

      // Check retry limit (max 3 attempts)
      if ((lead.numero_tentativas || 0) >= 3) {
        results.push({
          lead_id: lead.id,
          phone: formattedPhone,
          status: 'max_retries',
          error: 'Limite de tentativas atingido'
        });
        continue;
      }

      // Process message template
      const finalMessage = processTemplate(template, lead, campaignName);

      // Create message log entry
      const messageId = crypto.randomUUID();
      
      await supabase.from('message_logs').insert({
        id: messageId,
        lead_id: lead.id,
        message_id: messageId,
        phone_number: formattedPhone,
        message_text: finalMessage,
        status: 'pending',
        campaign_id,
        template_id,
        user_id
      });

      // Send to n8n webhook
      try {
        const webhookPayload = {
          lead_id: lead.id,
          telefone: formattedPhone,
          razao_social: lead.razao_social || lead.nome,
          cnpj: lead.cnpj,
          email: lead.email,
          message: finalMessage,
          message_id: messageId,
          campaign_id,
          timestamp: new Date().toISOString(),
          event
        };

        console.log(`Sending to webhook for lead ${lead.id}:`, webhookPayload);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(finalWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          let webhookResult: Record<string, unknown> = {};
          try {
            webhookResult = await response.json();
          } catch {
            // Response might not be JSON
          }

          // Update message log to sent
          await supabase.from('message_logs')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString(),
              message_id: webhookResult.message_id as string || messageId
            })
            .eq('id', messageId);

          // Update lead's last contact
          await supabase.from('leads')
            .update({ 
              ultimo_contato: new Date().toISOString(),
              numero_tentativas: (lead.numero_tentativas || 0) + 1
            })
            .eq('id', lead.id);

          results.push({
            lead_id: lead.id,
            phone: formattedPhone,
            status: 'sent',
            message_id: webhookResult.message_id as string || messageId
          });

        } else {
          const errorText = await response.text();
          console.error(`Webhook error for lead ${lead.id}:`, errorText);
          
          await supabase.from('message_logs')
            .update({ 
              status: 'failed', 
              error_message: `Webhook error: ${response.status}`,
              retry_count: 1
            })
            .eq('id', messageId);

          await supabase.from('leads')
            .update({ numero_tentativas: (lead.numero_tentativas || 0) + 1 })
            .eq('id', lead.id);

          results.push({
            lead_id: lead.id,
            phone: formattedPhone,
            status: 'failed',
            error: `Webhook error: ${response.status}`
          });
        }

      } catch (fetchError) {
        console.error(`Fetch error for lead ${lead.id}:`, fetchError);
        
        await supabase.from('message_logs')
          .update({ 
            status: 'failed', 
            error_message: fetchError instanceof Error ? fetchError.message : 'Fetch failed',
            retry_count: 1
          })
          .eq('id', messageId);

        results.push({
          lead_id: lead.id,
          phone: formattedPhone,
          status: 'failed',
          error: fetchError instanceof Error ? fetchError.message : 'Fetch failed'
        });
      }

      // Small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate metrics
    const metrics = {
      total: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      invalid_phone: results.filter(r => r.status === 'invalid_phone').length,
      blacklisted: results.filter(r => r.status === 'blacklisted').length,
      max_retries: results.filter(r => r.status === 'max_retries').length,
    };

    console.log('Dispatch completed:', metrics);

    return new Response(JSON.stringify({
      success: true,
      message: `Processados ${metrics.sent} de ${metrics.total} leads`,
      metrics,
      results,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Dispatch error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro no processamento' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
