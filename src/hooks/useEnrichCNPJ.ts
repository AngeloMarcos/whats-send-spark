import { useState, useCallback } from 'react';
import { Lead, Socio } from './useGooglePlaces';
import { supabase } from '@/integrations/supabase/client';

export interface EnrichmentProgress {
  current: number;
  total: number;
  status: string;
}

export interface EnrichmentMetrics {
  enriched: number;
  withEmail: number;
  totalSocios: number;
  phonesFound: number;
  failed: number;
  sociosWithPhone: number;
  totalPartnerPhones: number;
}

export function useEnrichCNPJ() {
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState<EnrichmentProgress>({ current: 0, total: 0, status: '' });

  // Extract CNPJ from lead data
  const extractCNPJ = useCallback((lead: Lead): string | null => {
    const cnpjPattern = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
    
    // Try in website URL
    if (lead.website) {
      const match = lead.website.match(cnpjPattern);
      if (match) return match[0].replace(/\D/g, '');
    }
    
    // Try in name or address
    const combined = `${lead.name} ${lead.address}`;
    const match = combined.match(cnpjPattern);
    if (match) return match[0].replace(/\D/g, '');
    
    return null;
  }, []);

  // Format phone to Brazilian standard
  const formatarTelefoneBR = useCallback((numero: string): string => {
    const cleaned = numero.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    
    return numero;
  }, []);

  // Fetch CNPJ data from BrasilAPI
  const fetchCNPJData = useCallback(async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
    
    if (!response.ok) {
      throw new Error('CNPJ não encontrado');
    }
    
    return response.json();
  }, []);

  // Search partner phones via Google Custom Search
  const buscarTelefonesSocio = useCallback(async (
    nomeSocio: string,
    cidade: string,
    uf?: string
  ): Promise<{ telefones: string[], fontes: string[] }> => {
    try {
      const { data, error } = await supabase.functions.invoke('search-partner-phones', {
        body: { 
          partnerName: nomeSocio, 
          city: cidade,
          state: uf
        }
      });

      if (error) {
        console.error('Error searching partner phones:', error);
        return { telefones: [], fontes: [] };
      }

      return {
        telefones: data?.phones || [],
        fontes: data?.sources || []
      };
    } catch (error) {
      console.error('Error in buscarTelefonesSocio:', error);
      return { telefones: [], fontes: [] };
    }
  }, []);

  // Main enrichment function
  const enriquecerLeads = useCallback(async (
    leads: Lead[],
    buscarTelefonesSocios: boolean = false
  ): Promise<Lead[]> => {
    setIsEnriching(true);
    setProgress({ current: 0, total: leads.length, status: 'Iniciando enriquecimento...' });
    
    const enrichedLeads: Lead[] = [];
    
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      setProgress({ 
        current: i + 1, 
        total: leads.length, 
        status: `Processando: ${lead.name.substring(0, 30)}...` 
      });
      
      try {
        // Try to extract CNPJ
        const cnpj = extractCNPJ(lead);
        
        if (!cnpj) {
          enrichedLeads.push({
            ...lead,
            enriched: false,
            enrichmentError: 'CNPJ não identificado'
          });
          continue;
        }
        
        // Fetch data from BrasilAPI
        const data = await fetchCNPJData(cnpj);
        
        // Process partners (QSA)
        const socios: Socio[] = [];
        
        for (const s of (data.qsa || [])) {
          const socio: Socio = {
            nome: s.nome_socio,
            qualificacao: s.qualificacao_socio,
            dataEntrada: s.data_entrada_sociedade,
            tipo: s.identificador_de_socio === 1 || s.identificador_de_socio === '1' ? 'PF' : 'PJ',
            telefonesEncontrados: [],
            fontesTelefones: []
          };
          
          // Search partner phones if enabled and partner is a person (PF)
          if (buscarTelefonesSocios && socio.tipo === 'PF') {
            setProgress({ 
              current: i + 1, 
              total: leads.length, 
              status: `Buscando telefones de ${socio.nome.substring(0, 20)}...` 
            });
            
            const { telefones, fontes } = await buscarTelefonesSocio(
              socio.nome,
              data.municipio || '',
              data.uf || ''
            );
            
            socio.telefonesEncontrados = telefones;
            socio.fontesTelefones = fontes;
            
            // Delay between phone searches to avoid rate limiting
            if (telefones.length > 0) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          socios.push(socio);
        }
        
        // Format official phones
        const telefonesOficiais: string[] = [];
        if (data.ddd_telefone_1) {
          telefonesOficiais.push(formatarTelefoneBR(data.ddd_telefone_1));
        }
        if (data.ddd_telefone_2) {
          telefonesOficiais.push(formatarTelefoneBR(data.ddd_telefone_2));
        }
        
        // Enriched lead
        enrichedLeads.push({
          ...lead,
          cnpj: data.cnpj,
          razaoSocial: data.razao_social,
          nomeFantasia: data.nome_fantasia || data.razao_social,
          email_oficial: data.email || undefined,
          telefones_oficiais: telefonesOficiais.length > 0 ? telefonesOficiais : undefined,
          situacao_cadastral: data.descricao_situacao_cadastral || data.situacao_cadastral,
          porte: data.porte,
          capital_social: data.capital_social,
          socios,
          enriched: true
        });
        
      } catch (error) {
        enrichedLeads.push({
          ...lead,
          enriched: false,
          enrichmentError: 'Erro ao consultar dados'
        });
      }
      
      // Delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setProgress({ current: leads.length, total: leads.length, status: 'Concluído!' });
    setIsEnriching(false);
    return enrichedLeads;
  }, [extractCNPJ, fetchCNPJData, formatarTelefoneBR, buscarTelefonesSocio]);

  // Calculate enrichment metrics
  const calculateMetrics = useCallback((leads: Lead[]): EnrichmentMetrics => {
    const enriched = leads.filter(l => l.enriched).length;
    const withEmail = leads.filter(l => l.email_oficial).length;
    const totalSocios = leads.reduce((acc, l) => acc + (l.socios?.length || 0), 0);
    const phonesFound = leads.reduce((acc, l) => acc + (l.telefones_oficiais?.length || 0), 0);
    const failed = leads.filter(l => l.enriched === false && l.enrichmentError).length;
    
    // New metrics for partner phones
    const sociosWithPhone = leads.reduce((acc, l) => {
      return acc + (l.socios?.filter(s => s.telefonesEncontrados && s.telefonesEncontrados.length > 0).length || 0);
    }, 0);
    
    const totalPartnerPhones = leads.reduce((acc, l) => {
      return acc + (l.socios?.reduce((sAcc, s) => sAcc + (s.telefonesEncontrados?.length || 0), 0) || 0);
    }, 0);
    
    return { enriched, withEmail, totalSocios, phonesFound, failed, sociosWithPhone, totalPartnerPhones };
  }, []);

  return {
    enriquecerLeads,
    isEnriching,
    progress,
    calculateMetrics
  };
}
