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

interface WebhookStatus {
  url: string | null;
  isConfigured: boolean;
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
  testWebhook: () => Promise<{ success: boolean; error?: string }>;
  refetch: () => void;
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
      // Count by status
      const { count: pendingCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      const { count: sentCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'enviado');

      const { count: contactedCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'contacted');

      // Count failed webhook calls (leads that were attempted but failed)
      const { count: failedCount } = await supabase
        .from('webhook_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('success', false);

      // Today's leads
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      setStats({
        pending: pendingCount || 0,
        sent: sentCount || 0,
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
        .select('id, cnpj, razao_social, nome_fantasia, telefones, telefones_array, status, created_at, municipio, uf')
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

  const fetchWebhookStatus = useCallback(async () => {
    if (!user) return;

    try {
      // Get webhook URL from settings
      const { data: settings } = await supabase
        .from('settings')
        .select('n8n_webhook_url')
        .eq('user_id', user.id)
        .single();

      // Get last webhook log
      const { data: lastLog } = await supabase
        .from('webhook_logs')
        .select('created_at, success, status_code, duration_ms, error_message')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setWebhookStatus({
        url: settings?.n8n_webhook_url || null,
        isConfigured: !!settings?.n8n_webhook_url,
        lastCallAt: lastLog?.created_at || null,
        lastCallSuccess: lastLog?.success ?? null,
        lastCallStatusCode: lastLog?.status_code || null,
        lastCallDuration: lastLog?.duration_ms || null,
        lastCallError: lastLog?.error_message || null,
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
        success: data?.success_count > 0,
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
      const pendingIds = pendingLeads.map(l => l.id);
      
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
        sent: data?.success_count || 0,
        failed: data?.fail_count || 0
      };
    } catch (error) {
      return { success: false, sent: 0, failed: pendingLeads.length };
    }
  }, [user, pendingLeads, fetchAll]);

  const saveWebhookUrl = useCallback(async (url: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ n8n_webhook_url: url || null, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ user_id: user.id, n8n_webhook_url: url || null });
        if (error) throw error;
      }

      await fetchWebhookStatus();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro ao salvar' };
    }
  }, [user, fetchWebhookStatus]);

  const testWebhook = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };
    if (!webhookStatus.url) return { success: false, error: 'URL não configurada' };

    try {
      const response = await fetch(webhookStatus.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: 'test-' + Date.now(), user_id: user.id, nome: 'Teste', telefones: '5511999999999', _test: true }),
      });
      return response.ok ? { success: true } : { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro de rede' };
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
