import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { LeadCapturado } from '@/types/leadCapture';

export interface LocalidadeSelecionada {
  tipo: 'estado' | 'municipio';
  nome: string;
  uf?: string;
  codigoIBGE?: string;
}

export interface AdvancedSearchFilters {
  // Características da Empresa
  cnaes: string[];
  incluirCnaePrincipal: boolean;
  incluirCnaeSecundario: boolean;
  tipoEmpresa: ('matriz' | 'filial')[];
  portes: string[];
  naturezasJuridicas: string[];
  situacao: 'ativas' | 'todas' | 'inativas' | 'suspensas' | 'baixadas';
  regimeTributario: string;
  capitalSocialMin: string;
  capitalSocialMax: string;
  palavrasChave: string[];
  
  // Localização
  localidades: LocalidadeSelecionada[];
  bairro: string;
  cep: string;
  ddd: string;
  
  // Datas
  tipoFiltroData: 'periodo' | 'data' | 'faixa' | 'todas';
  periodoUltimos: number | null;
  dataUnica: string;
  dataInicio: string;
  dataFim: string;
}

export const defaultFilters: AdvancedSearchFilters = {
  cnaes: [],
  incluirCnaePrincipal: true,
  incluirCnaeSecundario: true,
  tipoEmpresa: ['matriz', 'filial'],
  portes: [],
  naturezasJuridicas: [],
  situacao: 'ativas',
  regimeTributario: '',
  capitalSocialMin: '',
  capitalSocialMax: '',
  palavrasChave: [],
  localidades: [],
  bairro: '',
  cep: '',
  ddd: '',
  tipoFiltroData: 'todas',
  periodoUltimos: null,
  dataUnica: '',
  dataInicio: '',
  dataFim: '',
};

export function useAdvancedSearch() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<AdvancedSearchFilters>(defaultFilters);
  const [results, setResults] = useState<LeadCapturado[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const updateFilter = useCallback(<K extends keyof AdvancedSearchFilters>(
    key: K,
    value: AdvancedSearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setResults([]);
    setTotalResults(0);
    setCurrentPage(1);
  }, []);

  const search = useCallback(async (page = 1) => {
    if (!user) {
      toast.error('Você precisa estar logado para pesquisar');
      return;
    }

    setIsSearching(true);
    setCurrentPage(page);

    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Filtro de situação
      if (filters.situacao !== 'todas') {
        const situacaoMap: Record<string, string> = {
          'ativas': 'ATIVA',
          'inativas': 'INATIVA',
          'suspensas': 'SUSPENSA',
          'baixadas': 'BAIXADA',
        };
        query = query.eq('situacao', situacaoMap[filters.situacao] || 'ATIVA');
      }

      // Filtro de porte
      if (filters.portes.length > 0) {
        query = query.in('porte_empresa', filters.portes);
      }

      // Filtro de localização - UF
      const estados = filters.localidades.filter(l => l.tipo === 'estado').map(l => l.uf);
      if (estados.length > 0) {
        query = query.in('uf', estados.filter(Boolean) as string[]);
      }

      // Filtro de localização - Municípios
      const municipios = filters.localidades.filter(l => l.tipo === 'municipio').map(l => l.nome);
      if (municipios.length > 0) {
        query = query.in('municipio', municipios);
      }

      // Filtro de bairro
      if (filters.bairro) {
        query = query.ilike('bairro', `%${filters.bairro}%`);
      }

      // Filtro de CEP
      if (filters.cep) {
        const cleanCep = filters.cep.replace(/\D/g, '');
        query = query.ilike('cep', `%${cleanCep}%`);
      }

      // Filtro de palavras-chave (razão social ou nome fantasia)
      if (filters.palavrasChave.length > 0) {
        const keywordFilters = filters.palavrasChave.map(keyword => 
          `razao_social.ilike.%${keyword}%,nome_fantasia.ilike.%${keyword}%`
        );
        // Note: This is a simplified approach, proper OR filtering may need different implementation
        for (const keyword of filters.palavrasChave) {
          query = query.or(`razao_social.ilike.%${keyword}%,nome_fantasia.ilike.%${keyword}%`);
        }
      }

      // Filtro de regime tributário
      if (filters.regimeTributario) {
        query = query.eq('regime_tributario', filters.regimeTributario);
      }

      // Filtro de data de abertura
      if (filters.tipoFiltroData !== 'todas') {
        if (filters.tipoFiltroData === 'periodo' && filters.periodoUltimos) {
          const dataLimite = new Date();
          dataLimite.setDate(dataLimite.getDate() - filters.periodoUltimos);
          query = query.gte('data_abertura', dataLimite.toISOString().split('T')[0]);
        } else if (filters.tipoFiltroData === 'data' && filters.dataUnica) {
          query = query.eq('data_abertura', filters.dataUnica);
        } else if (filters.tipoFiltroData === 'faixa') {
          if (filters.dataInicio) {
            query = query.gte('data_abertura', filters.dataInicio);
          }
          if (filters.dataFim) {
            query = query.lte('data_abertura', filters.dataFim);
          }
        }
      }

      // Filtro de CNAE
      if (filters.cnaes.length > 0) {
        // Busca por atividade principal ou secundária
        query = query.or(
          filters.cnaes.map(cnae => `atividade.ilike.%${cnae}%`).join(',')
        );
      }

      // Paginação
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Ordenação
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to LeadCapturado format
      const transformedResults: LeadCapturado[] = (data || []).map(lead => ({
        id: lead.id,
        cnpj: lead.cnpj || '',
        razao_social: lead.razao_social || lead.nome || '',
        nome_fantasia: lead.nome_fantasia || '',
        telefones_raw: lead.telefones,
        telefones: Array.isArray(lead.telefones_array) 
          ? lead.telefones_array as any[]
          : [],
        email: lead.email || '',
        endereco: lead.endereco || '',
        logradouro: lead.logradouro || '',
        numero: lead.numero || '',
        complemento: lead.complemento || '',
        bairro: lead.bairro || '',
        municipio: lead.municipio || '',
        uf: lead.uf || '',
        cep: lead.cep || '',
        atividades_secundarias: Array.isArray(lead.atividades_secundarias) 
          ? lead.atividades_secundarias as string[]
          : [],
        situacao: lead.situacao || '',
        data_abertura: lead.data_abertura || '',
        capital_social: lead.capital_social || '',
        porte_empresa: lead.porte_empresa || '',
        regime_tributario: lead.regime_tributario || '',
        socios: Array.isArray(lead.socios) ? lead.socios as any[] : [],
        source: (lead.source as 'google_maps' | 'receitaws' | 'brasilapi' | 'manual') || 'manual',
      }));

      setResults(transformedResults);
      setTotalResults(count || 0);

      toast.success(`${count || 0} empresas encontradas`);
    } catch (error) {
      console.error('Erro na pesquisa:', error);
      toast.error('Erro ao realizar pesquisa');
    } finally {
      setIsSearching(false);
    }
  }, [user, filters, pageSize]);

  const nextPage = useCallback(() => {
    const maxPage = Math.ceil(totalResults / pageSize);
    if (currentPage < maxPage) {
      search(currentPage + 1);
    }
  }, [currentPage, totalResults, pageSize, search]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      search(currentPage - 1);
    }
  }, [currentPage, search]);

  const goToPage = useCallback((page: number) => {
    const maxPage = Math.ceil(totalResults / pageSize);
    if (page >= 1 && page <= maxPage) {
      search(page);
    }
  }, [totalResults, pageSize, search]);

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    results,
    isSearching,
    search,
    totalResults,
    currentPage,
    pageSize,
    nextPage,
    previousPage,
    goToPage,
    totalPages: Math.ceil(totalResults / pageSize),
  };
}
