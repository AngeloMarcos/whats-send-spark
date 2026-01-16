import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LeadAdmin {
  id: string;
  cnpj: string | null;
  nome: string | null;
  nome_fantasia: string | null;
  razao_social: string | null;
  email: string | null;
  telefones: string;
  telefones_array: unknown;
  status: string | null;
  source: string | null;
  situacao: string | null;
  atividade: string | null;
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  bairro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  porte_empresa: string | null;
  capital_social: string | null;
  data_abertura: string | null;
  socios: unknown;
  created_at: string | null;
  updated_at: string | null;
  bloqueado: boolean | null;
  numero_tentativas: number | null;
  ultimo_contato: string | null;
}

export interface LeadsFilters {
  search?: string;
  status?: string;
  source?: string;
  dateFrom?: Date;
  dateTo?: Date;
  uf?: string;
}

export interface LeadsStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  todayCount: number;
  weekCount: number;
}

interface UseLeadsAdminOptions {
  page?: number;
  pageSize?: number;
  filters?: LeadsFilters;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useLeadsAdmin(options: UseLeadsAdminOptions = {}) {
  const { user } = useAuth();
  const {
    page = 1,
    pageSize = 20,
    filters = {},
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options;

  const [leads, setLeads] = useState<LeadAdmin[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<LeadsStats>({
    total: 0,
    byStatus: {},
    bySource: {},
    todayCount: 0,
    weekCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leads with filters and pagination
  const fetchLeads = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Apply filters
      if (filters.search) {
        query = query.or(
          `nome_fantasia.ilike.%${filters.search}%,razao_social.ilike.%${filters.search}%,nome.ilike.%${filters.search}%,cnpj.ilike.%${filters.search}%,telefones.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.source) {
        query = query.eq('source', filters.source);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }

      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      if (filters.uf) {
        query = query.eq('uf', filters.uf);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      setLeads(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('[useLeadsAdmin] Error fetching leads:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar leads');
    } finally {
      setLoading(false);
    }
  }, [user?.id, page, pageSize, filters, sortBy, sortOrder]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Total count
      const { count: total } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count by status
      const { data: statusData } = await supabase
        .from('leads')
        .select('status')
        .eq('user_id', user.id);

      const byStatus: Record<string, number> = {};
      statusData?.forEach(lead => {
        const status = lead.status || 'unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;
      });

      // Count by source
      const { data: sourceData } = await supabase
        .from('leads')
        .select('source')
        .eq('user_id', user.id);

      const bySource: Record<string, number> = {};
      sourceData?.forEach(lead => {
        const source = lead.source || 'unknown';
        bySource[source] = (bySource[source] || 0) + 1;
      });

      // Today count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      // Week count
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: weekCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString());

      setStats({
        total: total || 0,
        byStatus,
        bySource,
        todayCount: todayCount || 0,
        weekCount: weekCount || 0
      });
    } catch (err) {
      console.error('[useLeadsAdmin] Error fetching stats:', err);
    }
  }, [user?.id]);

  // Update lead status
  const updateLeadStatus = useCallback(async (ids: string[], status: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh data
      await Promise.all([fetchLeads(), fetchStats()]);
    } catch (err) {
      console.error('[useLeadsAdmin] Error updating status:', err);
      throw err;
    }
  }, [user?.id, fetchLeads, fetchStats]);

  // Delete leads
  const deleteLeads = useCallback(async (ids: string[]) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh data
      await Promise.all([fetchLeads(), fetchStats()]);
    } catch (err) {
      console.error('[useLeadsAdmin] Error deleting leads:', err);
      throw err;
    }
  }, [user?.id, fetchLeads, fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    leads,
    totalCount,
    stats,
    loading,
    error,
    refetch: fetchLeads,
    updateLeadStatus,
    deleteLeads
  };
}
