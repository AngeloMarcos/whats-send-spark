import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LeadMonitor {
  id: string;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  telefones: string;
  telefones_array: string[] | null;
  status: string | null;
  created_at: string;
  municipio: string | null;
  uf: string | null;
  retry_count: number | null;
  last_webhook_attempt: string | null;
}

interface WebhookLog {
  id: string;
  lead_id: string | null;
  webhook_url: string;
  status_code: number | null;
  success: boolean;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface MonitorStats {
  pending: number;
  sent: number;
  contacted: number;
  failed: number;
  todayCount: number;
}

// Status do webhook baseado EXCLUSIVAMENTE no último log de webhook_logs
// Os campos de settings são ignorados para evitar exibir erros antigos
interface WebhookStatus {
  url: string | null;
  isConfigured: boolean;
  // Fonte da verdade: último registro em webhook_logs
  lastCallAt: string | null;
  lastCallSuccess: boolean | null;
  lastCallStatusCode: number | null;
  lastCallDuration: number | null;
  lastCallError: string | null;
}

interface UseLeadsMonitorReturn {
  stats: MonitorStats;
  pendingLeads: LeadMonitor[];
  recentLogs: WebhookLog[];
  webhookStatus: WebhookStatus;
  loading: boolean;
  resendLead: (leadId: string) => Promise<{ success: boolean; error?: string }>;
  resendAllPending: () => Promise<{ success: boolean; sent: number; failed: number }>;
  saveWebhookUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  testWebhook: () => Promise<{ success: boolean; error?: string; statusCode?: number }>;
  refetch: () => void;
}

// ============================================================
// Helper: Valida URL do webhook no frontend
// ============================================================
function validateWebhookUrlClient(urlString: string): { valid: boolean; error?: string } {
  if (!urlString || urlString.trim() === '') {
    return { valid: true }; // URL vazia é permitida (para limpar)
  }
  
  // Verificar formato básico
  if (!urlString.startsWith('https://')) {
    return { valid: false, error: 'A URL deve começar com https://' };
  }
  
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Bloquear localhost e IPs privados
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return { valid: false, error: 'URLs locais (localhost) não são permitidas.' };
    }
    
    if (hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return { valid: false, error: 'URLs de redes privadas não são permitidas.' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'URL inválida. Verifique o formato.' };
  }
}

// ============================================================
// Helper: Detecta se o erro indica workflow inativo no n8n
// ============================================================
export function isWorkflowInactiveError(error: string | null): boolean {
  if (!error) return false;
  const lowerError = error.toLowerCase();
  return lowerError.includes('workflow') && 
         (lowerError.includes('ativo') || lowerError.includes('active') || lowerError.includes('not registered'));
}

export function useLeadsMonitor(autoRefreshInterval = 30000): UseLeadsMonitorReturn {
  const { user } = useAuth();
  const [stats, setStats] = useState<MonitorStats>({
    pending: 0,
    sent: 0,
    contacted: 0,
    failed: 0,
    todayCount: 0
  });
  const [pendingLeads, setPendingLeads] = useState<LeadMonitor[]>([]);
  const [recentLogs, setRecentLogs] = useState<WebhookLog[]>([]);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus>({
    url: null,
    isConfigured: false,
    lastCallAt: null,
    lastCallSuccess: null,
    lastCallStatusCode: null,
    lastCallDuration: null,
    lastCallError: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      // Contar por status - incluindo 'sent' e 'enviado' para compatibilidade
      const { count: pendingCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      // Contar enviados (ambos status possíveis)
      const { count: sentCount1 } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'enviado');
        
      const { count: sentCount2 } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'sent');

      const { count: contactedCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'contacted');

      // Contar falhas de webhook nas últimas 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: failedCount } = await supabase
        .from('webhook_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('success', false)
        .gte('created_at', yesterday.toISOString());

      // Leads de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      setStats({
        pending: pendingCount || 0,
        sent: (sentCount1 || 0) + (sentCount2 || 0),
        contacted: contactedCount || 0,
        failed: failedCount || 0,
        todayCount: todayCount || 0
      });
    } catch (error) {
      console.error('[useLeadsMonitor] Error fetching stats:', error);
    }
  }, [user]);

  const fetchPendingLeads = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, cnpj, razao_social, nome_fantasia, telefones, telefones_array, status, created_at, municipio, uf, retry_count, last_webhook_attempt')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPendingLeads((data as LeadMonitor[]) || []);
    } catch (error) {
      console.error('[useLeadsMonitor] Error fetching pending leads:', error);
    }
  }, [user]);

  // ============================================================
  // FONTE ÚNICA DA VERDADE: webhook_logs (último registro)
  // Ignora campos de cache em settings para evitar mostrar erros antigos
  // ============================================================
  const fetchWebhookStatus = useCallback(async () => {
    if (!user) return;

    try {
      // Buscar apenas a URL das settings
      const { data: settings } = await supabase
        .from('settings')
        .select('n8n_webhook_url')
        .eq('user_id', user.id)
        .single();

      // Buscar último log de webhook (FONTE ÚNICA DA VERDADE para status)
      const { data: lastLog } = await supabase
        .from('webhook_logs')
        .select('created_at, success, status_code, duration_ms, error_message')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Se o último log foi sucesso, não mostrar erro
      // Se o último log foi falha, mostrar o erro desse log
      setWebhookStatus({
        url: settings?.n8n_webhook_url || null,
        isConfigured: !!settings?.n8n_webhook_url,
        lastCallAt: lastLog?.created_at || null,
        lastCallSuccess: lastLog?.success ?? null,
        lastCallStatusCode: lastLog?.status_code || null,
        lastCallDuration: lastLog?.duration_ms || null,
        lastCallError: lastLog?.success === false ? lastLog?.error_message : null,
      });
    } catch (error) {
      console.error('[useLeadsMonitor] Error fetching webhook status:', error);
    }
  }, [user]);

  const fetchRecentLogs = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('id, lead_id, webhook_url, status_code, success, error_message, duration_ms, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentLogs((data as WebhookLog[]) || []);
    } catch (error) {
      console.error('[useLeadsMonitor] Error fetching logs:', error);
    }
  }, [user]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchPendingLeads(),
      fetchWebhookStatus(),
      fetchRecentLogs()
    ]);
    setLoading(false);
  }, [fetchStats, fetchPendingLeads, fetchWebhookStatus, fetchRecentLogs]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (!user) return;

    fetchAll();

    const interval = setInterval(fetchAll, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [user, fetchAll, autoRefreshInterval]);

  const resendLead = useCallback(async (leadId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      const { data, error } = await supabase.functions.invoke('notify-n8n-new-lead', {
        body: { 
          lead_ids: [leadId],
          user_id: user.id 
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Refresh data after resend
      await fetchAll();

      return { 
        success: data?.successful > 0 || data?.success_count > 0,
        error: data?.results?.[0]?.error 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }, [user, fetchAll]);

  const resendAllPending = useCallback(async (): Promise<{ success: boolean; sent: number; failed: number }> => {
    if (!user) return { success: false, sent: 0, failed: 0 };

    try {
      // Filtrar apenas leads com retry_count < 3
      const { data: eligibleLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .or('retry_count.is.null,retry_count.lt.3')
        .limit(50);
      
      const pendingIds = eligibleLeads?.map(l => l.id) || [];
      
      if (pendingIds.length === 0) {
        return { success: true, sent: 0, failed: 0 };
      }

      const { data, error } = await supabase.functions.invoke('notify-n8n-new-lead', {
        body: { 
          lead_ids: pendingIds,
          user_id: user.id 
        }
      });

      if (error) {
        return { success: false, sent: 0, failed: pendingIds.length };
      }

      // Refresh data after resend
      await fetchAll();

      return { 
        success: true,
        sent: data?.successful || data?.success_count || 0,
        failed: data?.failed || data?.fail_count || 0
      };
    } catch (error) {
      return { success: false, sent: 0, failed: pendingLeads.length };
    }
  }, [user, pendingLeads, fetchAll]);

  const saveWebhookUrl = useCallback(async (url: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    // Validar URL antes de salvar
    const validation = validateWebhookUrlClient(url);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const normalizedUrl = url.trim() || null;
      
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ 
            n8n_webhook_url: normalizedUrl, 
            updated_at: new Date().toISOString(),
            // Limpar status anterior ao mudar a URL
            n8n_webhook_last_status: null,
            n8n_webhook_last_error: null,
            n8n_webhook_last_called_at: null,
          })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ user_id: user.id, n8n_webhook_url: normalizedUrl });
        if (error) throw error;
      }

      await fetchWebhookStatus();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao salvar' };
    }
  }, [user, fetchWebhookStatus]);

  // ============================================================
  // TESTE DE WEBHOOK: Registra o resultado em webhook_logs
  // para que a UI reflita o status real imediatamente
  // ============================================================
  const testWebhook = useCallback(async (): Promise<{ success: boolean; error?: string; statusCode?: number }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };
    if (!webhookStatus.url) return { success: false, error: 'URL não configurada' };

    const startTime = Date.now();
    let statusCode = 0;
    let success = false;
    let errorMessage: string | null = null;
    let responseBody = '';

    try {
      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const testPayload = { 
        lead_id: 'test-' + Date.now(), 
        user_id: user.id, 
        nome: 'Teste de Conexão', 
        telefones: '5511999999999',
        created_at: new Date().toISOString(),
        _test: true,
        lead: {
          id: 'test-' + Date.now(),
          nome_fantasia: 'Teste de Conexão',
          telefones: '5511999999999',
        }
      };
      
      try {
        const response = await fetch(webhookStatus.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        statusCode = response.status;
        success = response.ok;
        
        if (!success) {
          responseBody = await response.text();
          if (responseBody.includes('workflow must be active') || responseBody.includes('not registered')) {
            errorMessage = 'O workflow do n8n não está ativo. Ative-o no editor do n8n.';
          } else {
            errorMessage = `HTTP ${response.status}`;
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            errorMessage = 'Timeout: o webhook não respondeu em 10 segundos.';
          } else {
            errorMessage = `Erro de conexão: ${fetchError.message}`;
          }
        } else {
          errorMessage = 'Erro de rede desconhecido';
        }
      }
      
      const durationMs = Date.now() - startTime;
      
      // ============================================================
      // REGISTRAR RESULTADO DO TESTE EM webhook_logs
      // Isso garante que a UI reflita o resultado imediatamente
      // ============================================================
      await supabase.from('webhook_logs').insert({
        user_id: user.id,
        lead_id: null, // Teste, não tem lead associado
        webhook_url: webhookStatus.url,
        request_payload: testPayload,
        status_code: statusCode || null,
        response_body: responseBody.substring(0, 2000) || null,
        error_message: errorMessage,
        duration_ms: durationMs,
        success: success,
      });
      
      return { 
        success, 
        error: errorMessage || undefined, 
        statusCode: statusCode || undefined 
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMsg };
    }
  }, [user, webhookStatus.url]);

  return {
    stats,
    pendingLeads,
    recentLogs,
    webhookStatus,
    loading,
    resendLead,
    resendAllPending,
    saveWebhookUrl,
    testWebhook,
    refetch: fetchAll
  };
}
