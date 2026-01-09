import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { 
  MessageLog, 
  CampaignTrigger, 
  BlacklistEntry, 
  DispatchPayload, 
  DispatchResponse,
  DispatchMetrics
} from '@/types/dispatch';

export function useDispatchSystem() {
  const { user } = useAuth();
  const [isDispatching, setIsDispatching] = useState(false);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [triggers, setTriggers] = useState<CampaignTrigger[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [metrics, setMetrics] = useState<DispatchMetrics | null>(null);

  // Dispatch messages to leads
  const dispatchToLeads = useCallback(async (payload: Omit<DispatchPayload, 'user_id'>): Promise<DispatchResponse | null> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    setIsDispatching(true);
    try {
      const { data, error } = await supabase.functions.invoke('disparo-leads', {
        body: {
          ...payload,
          user_id: user.id
        }
      });

      if (error) {
        console.error('Dispatch error:', error);
        toast.error(error.message || 'Erro ao disparar mensagens');
        return null;
      }

      const response = data as DispatchResponse;
      
      if (response.success) {
        toast.success(response.message);
        if (response.metrics) {
          setMetrics(response.metrics);
        }
      } else {
        toast.warning(response.message || 'Disparo concluído com avisos');
      }

      return response;
    } catch (err) {
      console.error('Dispatch error:', err);
      toast.error('Erro ao disparar mensagens');
      return null;
    } finally {
      setIsDispatching(false);
    }
  }, [user]);

  // Manual dispatch to specific lead
  const dispatchToLead = useCallback(async (leadId: string, templateId?: string, campaignId?: string) => {
    return dispatchToLeads({
      event: 'manual_dispatch',
      lead_id: leadId,
      template_id: templateId,
      campaign_id: campaignId
    });
  }, [dispatchToLeads]);

  // Bulk dispatch with filters
  const bulkDispatch = useCallback(async (filters?: DispatchPayload['filters'], templateId?: string, campaignId?: string) => {
    return dispatchToLeads({
      event: 'manual_dispatch',
      template_id: templateId,
      campaign_id: campaignId,
      filters
    });
  }, [dispatchToLeads]);

  // Fetch message logs
  const fetchMessageLogs = useCallback(async (filters?: { 
    lead_id?: string; 
    campaign_id?: string; 
    status?: string;
    limit?: number;
  }) => {
    if (!user) return;

    let query = supabase
      .from('message_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filters?.lead_id) {
      query = query.eq('lead_id', filters.lead_id);
    }
    if (filters?.campaign_id) {
      query = query.eq('campaign_id', filters.campaign_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching message logs:', error);
      toast.error('Erro ao carregar logs de mensagens');
      return;
    }

    setMessageLogs(data as MessageLog[]);
  }, [user]);

  // Fetch campaign triggers
  const fetchTriggers = useCallback(async (campaignId?: string) => {
    if (!user) return;

    let query = supabase
      .from('campaign_triggers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching triggers:', error);
      toast.error('Erro ao carregar gatilhos');
      return;
    }

    setTriggers(data as CampaignTrigger[]);
  }, [user]);

  // Create campaign trigger
  const createTrigger = useCallback(async (trigger: Omit<CampaignTrigger, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('campaign_triggers')
      .insert({
        ...trigger,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trigger:', error);
      toast.error('Erro ao criar gatilho');
      return null;
    }

    toast.success('Gatilho criado com sucesso');
    await fetchTriggers();
    return data as CampaignTrigger;
  }, [user, fetchTriggers]);

  // Update trigger
  const updateTrigger = useCallback(async (id: string, updates: Partial<CampaignTrigger>) => {
    if (!user) return false;

    const { error } = await supabase
      .from('campaign_triggers')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating trigger:', error);
      toast.error('Erro ao atualizar gatilho');
      return false;
    }

    toast.success('Gatilho atualizado');
    await fetchTriggers();
    return true;
  }, [user, fetchTriggers]);

  // Delete trigger
  const deleteTrigger = useCallback(async (id: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('campaign_triggers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting trigger:', error);
      toast.error('Erro ao excluir gatilho');
      return false;
    }

    toast.success('Gatilho excluído');
    await fetchTriggers();
    return true;
  }, [user, fetchTriggers]);

  // Fetch blacklist
  const fetchBlacklist = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('blacklist')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching blacklist:', error);
      toast.error('Erro ao carregar blacklist');
      return;
    }

    setBlacklist(data as BlacklistEntry[]);
  }, [user]);

  // Add to blacklist
  const addToBlacklist = useCallback(async (phoneNumber: string, reason?: string) => {
    if (!user) return false;

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    const { error } = await supabase
      .from('blacklist')
      .insert({
        phone_number: normalizedPhone,
        reason,
        added_by: user.id,
        user_id: user.id
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Número já está na blacklist');
      } else {
        console.error('Error adding to blacklist:', error);
        toast.error('Erro ao adicionar à blacklist');
      }
      return false;
    }

    toast.success('Número adicionado à blacklist');
    await fetchBlacklist();
    return true;
  }, [user, fetchBlacklist]);

  // Remove from blacklist
  const removeFromBlacklist = useCallback(async (id: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('blacklist')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing from blacklist:', error);
      toast.error('Erro ao remover da blacklist');
      return false;
    }

    toast.success('Número removido da blacklist');
    await fetchBlacklist();
    return true;
  }, [user, fetchBlacklist]);

  // Calculate dispatch metrics from logs
  const calculateMetrics = useCallback(async (campaignId?: string) => {
    if (!user) return null;

    let query = supabase
      .from('message_logs')
      .select('status')
      .eq('user_id', user.id);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error calculating metrics:', error);
      return null;
    }

    const logs = data || [];
    const total = logs.length;
    const sent = logs.filter(l => l.status === 'sent' || l.status === 'delivered' || l.status === 'read').length;
    const delivered = logs.filter(l => l.status === 'delivered' || l.status === 'read').length;
    const read = logs.filter(l => l.status === 'read').length;
    const failed = logs.filter(l => l.status === 'failed').length;

    return {
      total,
      sent,
      delivered,
      read,
      failed,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : '0',
      readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : '0',
      errorRate: total > 0 ? ((failed / total) * 100).toFixed(1) : '0'
    };
  }, [user]);

  return {
    // State
    isDispatching,
    messageLogs,
    triggers,
    blacklist,
    metrics,

    // Dispatch functions
    dispatchToLeads,
    dispatchToLead,
    bulkDispatch,

    // Message logs
    fetchMessageLogs,

    // Triggers
    fetchTriggers,
    createTrigger,
    updateTrigger,
    deleteTrigger,

    // Blacklist
    fetchBlacklist,
    addToBlacklist,
    removeFromBlacklist,

    // Metrics
    calculateMetrics
  };
}
