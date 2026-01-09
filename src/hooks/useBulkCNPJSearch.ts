import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { LeadCapturado, BulkSearchProgress } from '@/types/leadCapture';
import { processPhones } from '@/lib/phoneUtils';
import { cleanCNPJ, validateCNPJ, formatCNPJ } from '@/hooks/useReceitaWS';

interface ReceitaWSResponse {
  status?: string;
  message?: string;
  cnpj?: string;
  nome?: string;
  fantasia?: string;
  email?: string;
  telefone?: string;
  situacao?: string;
  atividade_principal?: Array<{ text?: string; code?: string }>;
  atividades_secundarias?: Array<{ text?: string; code?: string }>;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  data_abertura?: string;
  capital_social?: string;
  porte?: string;
  tipo?: string;
  qsa?: Array<{ nome?: string; qual?: string }>;
  natureza_juridica?: string;
}

interface UseBulkCNPJSearchOptions {
  delayBetweenRequests?: number;
  onProgress?: (progress: BulkSearchProgress) => void;
  onLeadFound?: (lead: LeadCapturado) => void;
}

export function useBulkCNPJSearch(options: UseBulkCNPJSearchOptions = {}) {
  const { 
    delayBetweenRequests = 1500, 
    onProgress, 
    onLeadFound 
  } = options;

  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState<BulkSearchProgress>({
    current: 0,
    total: 0,
    found: 0,
    errors: 0,
  });
  const [results, setResults] = useState<LeadCapturado[]>([]);
  const abortRef = useRef(false);

  const transformResponse = (response: ReceitaWSResponse): LeadCapturado | null => {
    if (response.status === 'ERROR' || !response.nome) {
      return null;
    }

    const phoneString = response.telefone || '';
    const phones = processPhones(phoneString, response.nome);
    
    const endereco = [
      response.logradouro,
      response.numero,
      response.complemento,
      response.bairro,
      response.municipio,
      response.uf,
      response.cep,
    ].filter(Boolean).join(', ');

    return {
      id: crypto.randomUUID(),
      cnpj: formatCNPJ(response.cnpj || ''),
      situacao: response.situacao || 'DESCONHECIDA',
      razao_social: response.nome || '',
      nome_fantasia: response.fantasia || undefined,
      email: response.email || undefined,
      data_abertura: response.data_abertura || undefined,
      capital_social: response.capital_social || undefined,
      porte_empresa: response.porte || undefined,
      tipo: response.tipo || undefined,
      cep: response.cep || undefined,
      logradouro: response.logradouro || undefined,
      numero: response.numero || undefined,
      complemento: response.complemento || undefined,
      bairro: response.bairro || undefined,
      municipio: response.municipio || undefined,
      uf: response.uf || undefined,
      endereco,
      telefones_raw: phoneString,
      telefones: phones,
      socios: response.qsa?.map(s => ({ nome: s.nome || '', qual: s.qual })) || [],
      owner_name: response.qsa?.[0]?.nome || undefined,
      atividade_principal: response.atividade_principal?.[0]?.text || undefined,
      atividades_secundarias: response.atividades_secundarias?.map(a => a.text || '') || [],
      source: 'receitaws',
    };
  };

  const fetchCNPJ = async (cnpj: string): Promise<LeadCapturado | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Try ReceitaWS first
      const response = await fetch(
        `https://www.receitaws.com.br/v1/cnpj/${cnpj}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ReceitaWSResponse = await response.json();
      return transformResponse(data);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Try Brasil API as fallback
      try {
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), 10000);
        
        const fallbackResponse = await fetch(
          `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
          { signal: fallbackController.signal }
        );
        
        clearTimeout(fallbackTimeout);
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          // Transform Brasil API format to our format
          return {
            id: crypto.randomUUID(),
            cnpj: formatCNPJ(fallbackData.cnpj || cnpj),
            situacao: fallbackData.descricao_situacao_cadastral || 'DESCONHECIDA',
            razao_social: fallbackData.razao_social || '',
            nome_fantasia: fallbackData.nome_fantasia || undefined,
            email: fallbackData.email || undefined,
            data_abertura: fallbackData.data_inicio_atividade || undefined,
            capital_social: fallbackData.capital_social?.toString() || undefined,
            porte_empresa: fallbackData.porte || undefined,
            cep: fallbackData.cep || undefined,
            logradouro: fallbackData.logradouro || undefined,
            numero: fallbackData.numero || undefined,
            complemento: fallbackData.complemento || undefined,
            bairro: fallbackData.bairro || undefined,
            municipio: fallbackData.municipio || undefined,
            uf: fallbackData.uf || undefined,
            endereco: [
              fallbackData.logradouro,
              fallbackData.numero,
              fallbackData.bairro,
              fallbackData.municipio,
              fallbackData.uf,
            ].filter(Boolean).join(', '),
            telefones_raw: fallbackData.ddd_telefone_1 || '',
            telefones: processPhones(
              [fallbackData.ddd_telefone_1, fallbackData.ddd_telefone_2].filter(Boolean).join(' / '),
              fallbackData.razao_social
            ),
            socios: fallbackData.qsa?.map((s: { nome_socio?: string; qualificacao_socio?: string }) => ({
              nome: s.nome_socio || '',
              qual: s.qualificacao_socio,
            })) || [],
            owner_name: fallbackData.qsa?.[0]?.nome_socio || undefined,
            atividade_principal: fallbackData.cnae_fiscal_descricao || undefined,
            atividades_secundarias: fallbackData.cnaes_secundarios?.map((c: { descricao?: string }) => c.descricao || '') || [],
            source: 'brasilapi',
          };
        }
      } catch {
        // Both APIs failed
      }
      
      console.error(`Failed to fetch CNPJ ${cnpj}:`, error);
      return null;
    }
  };

  const searchBulk = useCallback(async (cnpjList: string[]) => {
    // Clean and validate CNPJs
    const validCnpjs = cnpjList
      .map(c => cleanCNPJ(c))
      .filter(c => c.length === 14 && validateCNPJ(c));

    if (validCnpjs.length === 0) {
      toast.error('Nenhum CNPJ válido encontrado');
      return [];
    }

    // Remove duplicates
    const uniqueCnpjs = [...new Set(validCnpjs)];

    setIsSearching(true);
    abortRef.current = false;
    setResults([]);
    
    const initialProgress: BulkSearchProgress = {
      current: 0,
      total: uniqueCnpjs.length,
      found: 0,
      errors: 0,
    };
    setProgress(initialProgress);

    const foundLeads: LeadCapturado[] = [];

    for (let i = 0; i < uniqueCnpjs.length; i++) {
      if (abortRef.current) {
        toast.info('Busca cancelada');
        break;
      }

      const cnpj = uniqueCnpjs[i];
      const currentProgress: BulkSearchProgress = {
        ...initialProgress,
        current: i + 1,
        currentCnpj: formatCNPJ(cnpj),
        found: foundLeads.length,
      };
      
      setProgress(currentProgress);
      onProgress?.(currentProgress);

      try {
        const lead = await fetchCNPJ(cnpj);
        
        if (lead) {
          foundLeads.push(lead);
          setResults(prev => [...prev, lead]);
          onLeadFound?.(lead);
        } else {
          currentProgress.errors++;
        }
      } catch {
        currentProgress.errors++;
      }

      // Rate limiting delay
      if (i < uniqueCnpjs.length - 1 && !abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }

    setIsSearching(false);
    
    const finalProgress: BulkSearchProgress = {
      current: uniqueCnpjs.length,
      total: uniqueCnpjs.length,
      found: foundLeads.length,
      errors: uniqueCnpjs.length - foundLeads.length,
    };
    setProgress(finalProgress);
    
    toast.success(`Busca concluída: ${foundLeads.length} leads encontrados`);
    return foundLeads;
  }, [delayBetweenRequests, onProgress, onLeadFound]);

  const cancelSearch = useCallback(() => {
    abortRef.current = true;
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setProgress({ current: 0, total: 0, found: 0, errors: 0 });
  }, []);

  return {
    isSearching,
    progress,
    results,
    searchBulk,
    cancelSearch,
    clearResults,
  };
}
