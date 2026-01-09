import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { AdvancedSearchFilters } from './useAdvancedSearch';

export interface PesquisaSalva {
  id: string;
  nome: string;
  descricao: string | null;
  filtros: AdvancedSearchFilters;
  total_resultados: number;
  created_at: string;
  updated_at: string;
}

export function useSavedSearches() {
  const { user } = useAuth();
  const [searches, setSearches] = useState<PesquisaSalva[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSearches = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pesquisas_salvas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSearches((data || []).map(item => ({
        ...item,
        filtros: item.filtros as unknown as AdvancedSearchFilters,
      })));
    } catch (error) {
      console.error('Erro ao buscar pesquisas salvas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSearches();
  }, [fetchSearches]);

  const saveSearch = useCallback(async (
    nome: string,
    filtros: AdvancedSearchFilters,
    descricao?: string,
    totalResultados?: number
  ) => {
    if (!user) {
      toast.error('Você precisa estar logado para salvar pesquisas');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('pesquisas_salvas')
        .insert([{
          user_id: user.id,
          nome,
          descricao: descricao || null,
          filtros: filtros as unknown as Record<string, unknown>,
          total_resultados: totalResultados || 0,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Pesquisa salva com sucesso');
      await fetchSearches();
      
      return data;
    } catch (error) {
      console.error('Erro ao salvar pesquisa:', error);
      toast.error('Erro ao salvar pesquisa');
      return null;
    }
  }, [user, fetchSearches]);

  const updateSearch = useCallback(async (
    id: string,
    updates: Partial<Pick<PesquisaSalva, 'nome' | 'descricao' | 'filtros' | 'total_resultados'>>
  ) => {
    if (!user) return false;

    try {
      const updateData: Record<string, unknown> = {};
      if (updates.nome !== undefined) updateData.nome = updates.nome;
      if (updates.descricao !== undefined) updateData.descricao = updates.descricao;
      if (updates.filtros !== undefined) updateData.filtros = updates.filtros as unknown as Record<string, unknown>;
      if (updates.total_resultados !== undefined) updateData.total_resultados = updates.total_resultados;

      const { error } = await supabase
        .from('pesquisas_salvas')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Pesquisa atualizada');
      await fetchSearches();
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar pesquisa:', error);
      toast.error('Erro ao atualizar pesquisa');
      return false;
    }
  }, [user, fetchSearches]);

  const deleteSearch = useCallback(async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('pesquisas_salvas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Pesquisa excluída');
      await fetchSearches();
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir pesquisa:', error);
      toast.error('Erro ao excluir pesquisa');
      return false;
    }
  }, [user, fetchSearches]);

  return {
    searches,
    isLoading,
    saveSearch,
    updateSearch,
    deleteSearch,
    refreshSearches: fetchSearches,
  };
}
