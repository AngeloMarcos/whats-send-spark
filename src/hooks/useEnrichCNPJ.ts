import { useState, useCallback } from 'react';
import { Lead, Socio } from './useGooglePlaces';
import { supabase } from '@/integrations/supabase/client';
import { fetchCNPJBiz, searchCNPJByName as searchCNPJBiz } from '@/lib/cnpjBizClient';

export interface EnrichmentProgress {
  current: number;
  total: number;
  status: string;
  step?: 'searching_cnpj' | 'fetching_data' | 'searching_phones' | 'done';
}

export interface EnrichmentMetrics {
  enriched: number;
  withEmail: number;
  totalSocios: number;
  phonesFound: number;
  failed: number;
  sociosWithPhone: number;
  totalPartnerPhones: number;
  cnpjFoundByName: number;
}

interface CNPJSearchResult {
  cnpj: string | null;
  razao_social?: string;
  nome_fantasia?: string;
  municipio?: string;
  uf?: string;
  situacao?: string;
  porte?: string;
  capital_social?: number;
  email?: string;
  telefone_1?: string;
  telefone_2?: string;
  qsa?: Array<{
    nome_socio: string;
    qualificacao_socio: string;
    data_entrada_sociedade?: string;
    identificador_de_socio?: number | string;
    cnpj_cpf_do_socio?: string;
  }>;
  similarity: number;
  message?: string;
  source?: 'cnpj_biz' | 'google_cse' | 'brasil_api';
}

export function useEnrichCNPJ() {
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState<EnrichmentProgress>({ current: 0, total: 0, status: '' });

  // Calculate name similarity for matching
  const calculateNameSimilarity = useCallback((
    searchName: string,
    razaoSocial?: string,
    nomeFantasia?: string
  ): number => {
    const normalize = (s: string) => s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(ltda|me|epp|eireli|s\.?a\.?|ss|sociedade|servicos?|comercio|industria|restaurante|lanchonete|pizzaria|padaria|supermercado|mercado|loja|bar|cafe|hotel|pousada)\b/gi, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const searchNorm = normalize(searchName);
    const razaoNorm = razaoSocial ? normalize(razaoSocial) : '';
    const fantasiaNorm = nomeFantasia ? normalize(nomeFantasia) : '';

    // Check if one contains the other
    const checkContains = (a: string, b: string): number => {
      if (!a || !b) return 0;
      if (a === b) return 1.0;
      if (a.includes(b) || b.includes(a)) return 0.85;
      
      const wordsA = a.split(' ').filter(w => w.length > 2);
      const wordsB = b.split(' ').filter(w => w.length > 2);
      
      if (wordsA.length === 0 || wordsB.length === 0) return 0;
      
      const matches = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
      return matches.length / Math.max(wordsA.length, wordsB.length);
    };

    const simRazao = checkContains(searchNorm, razaoNorm);
    const simFantasia = checkContains(searchNorm, fantasiaNorm);

    return Math.max(simRazao, simFantasia);
  }, []);

  // Extract CNPJ from lead data (rarely works with Google Maps data)
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

  // Extract city and state from Google Maps address
  const extractCityState = useCallback((address: string): { city: string; state: string } => {
    // Brazilian address pattern: "..., Cidade - UF, CEP-XXX, Brasil"
    const parts = address.split(',').map(p => p.trim());
    
    let city = '';
    let state = '';
    
    for (const part of parts) {
      // Look for pattern "City - UF"
      const cityStateMatch = part.match(/^([^-]+)\s*-\s*([A-Z]{2})$/);
      if (cityStateMatch) {
        city = cityStateMatch[1].trim();
        state = cityStateMatch[2];
        break;
      }
      
      // Look for just state abbreviation
      const stateMatch = part.match(/^([A-Z]{2})$/);
      if (stateMatch && !state) {
        state = stateMatch[1];
      }
    }
    
    // Fallback: try to find state in any part
    if (!state) {
      const stateMatch = address.match(/\b([A-Z]{2})\b(?=\s*[,-]|\s*\d{5}|\s*Brasil)/);
      if (stateMatch) state = stateMatch[1];
    }
    
    return { city, state };
  }, []);

  // Search CNPJ using CNPJ Biz API (primary source)
  const buscarCNPJBiz = useCallback(async (
    companyName: string,
    city: string,
    state: string
  ): Promise<CNPJSearchResult> => {
    try {
      console.log(`[CNPJ Biz] Searching for: ${companyName} in ${city}/${state}`);
      
      const result = await searchCNPJBiz(companyName, city, state);
      
      if (!result || result.status === 'ERROR') {
        console.log('[CNPJ Biz] No result found');
        return { cnpj: null, similarity: 0 };
      }
      
      // Calculate similarity
      const similarity = calculateNameSimilarity(companyName, result.razao_social, result.nome_fantasia);
      
      console.log(`[CNPJ Biz] Found: ${result.cnpj} (${result.razao_social}) with similarity ${similarity.toFixed(2)}`);
      
      // Map CNPJ Biz response to expected format
      return {
        cnpj: result.cnpj?.replace(/\D/g, '') || null,
        razao_social: result.razao_social,
        nome_fantasia: result.nome_fantasia,
        municipio: result.municipio,
        uf: result.uf,
        situacao: result.situacao_cadastral,
        porte: result.porte,
        capital_social: result.capital_social,
        email: result.email,
        telefone_1: result.telefone,
        qsa: result.qsa?.map(s => ({
          nome_socio: s.nome,
          qualificacao_socio: s.qualificacao,
          identificador_de_socio: 2, // Assume PF for now
        })) || [],
        similarity,
        source: 'cnpj_biz'
      };
    } catch (error) {
      console.error('[CNPJ Biz] Error:', error);
      return { cnpj: null, similarity: 0 };
    }
  }, [calculateNameSimilarity]);

  // Search CNPJ by company name using Edge Function (fallback - Google CSE + OpenCNPJ)
  const buscarCNPJPorNome = useCallback(async (
    companyName: string,
    city: string,
    state: string,
    address: string
  ): Promise<CNPJSearchResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('search-cnpj-by-name', {
        body: { 
          companyName,
          city,
          state,
          address
        }
      });

      if (error) {
        console.error('Error searching CNPJ by name:', error);
        return { cnpj: null, similarity: 0 };
      }

      return {
        cnpj: data?.cnpj || null,
        razao_social: data?.razao_social,
        nome_fantasia: data?.nome_fantasia,
        municipio: data?.municipio,
        uf: data?.uf,
        situacao: data?.situacao,
        porte: data?.porte,
        capital_social: data?.capital_social,
        email: data?.email,
        telefone_1: data?.telefone_1,
        telefone_2: data?.telefone_2,
        qsa: data?.qsa || [],
        similarity: data?.similarity || 0,
        message: data?.message,
        source: 'google_cse'
      };
    } catch (error) {
      console.error('Error in buscarCNPJPorNome:', error);
      return { cnpj: null, similarity: 0 };
    }
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

  // Search partner phones via multi-layer edge function
  const buscarTelefonesSocio = useCallback(async (
    nomeSocio: string,
    cidade: string,
    uf?: string,
    empresaNome?: string,
    empresaCNPJ?: string
  ): Promise<{ 
    telefones: string[], 
    fontes: string[], 
    confiabilidades: string[],
    tipos: string[]
  }> => {
    try {
      const { data, error } = await supabase.functions.invoke('search-socio-phones-v2', {
        body: { 
          socioNome: nomeSocio, 
          cidade,
          uf,
          empresaNome: empresaNome || '',
          empresaCNPJ: empresaCNPJ || ''
        }
      });

      if (error) {
        console.error('Error searching partner phones:', error);
        return { telefones: [], fontes: [], confiabilidades: [], tipos: [] };
      }

      // Extract data from the new response format
      const telefones = data?.telefones || [];
      return {
        telefones: telefones.map((t: any) => t.telefone),
        fontes: telefones.map((t: any) => t.urlFonte || t.fonte),
        confiabilidades: telefones.map((t: any) => t.confiabilidade),
        tipos: telefones.map((t: any) => t.tipo)
      };
    } catch (error) {
      console.error('Error in buscarTelefonesSocio:', error);
      return { telefones: [], fontes: [], confiabilidades: [], tipos: [] };
    }
  }, []);

  // Main enrichment function
  const enriquecerLeads = useCallback(async (
    leads: Lead[],
    buscarTelefonesSocios: boolean = false,
    overrideLocation?: { city: string; state: string }
  ): Promise<Lead[]> => {
    setIsEnriching(true);
    setProgress({ current: 0, total: leads.length, status: 'Iniciando enriquecimento...', step: 'searching_cnpj' });
    
    const enrichedLeads: Lead[] = [];
    let cnpjFoundByNameCount = 0;
    
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      
      try {
        // Step 1: Try to extract CNPJ directly (rarely works)
        let cnpj = extractCNPJ(lead);
        let foundByName = false;
        let cnpjData: CNPJSearchResult | null = null;
        
        // Step 2: If no CNPJ found, try CNPJ Biz first (primary source)
        if (!cnpj) {
          const { city, state } = overrideLocation || extractCityState(lead.address);
          
          // Try CNPJ Biz first (more reliable paid API)
          setProgress({ 
            current: i + 1, 
            total: leads.length, 
            status: `🔍 Buscando CNPJ (Biz): ${lead.name.substring(0, 25)}...`,
            step: 'searching_cnpj'
          });
          
          const bizResult = await buscarCNPJBiz(lead.name, city, state);
          
          if (bizResult.cnpj && bizResult.similarity >= 0.45) {
            cnpj = bizResult.cnpj;
            cnpjData = bizResult;
            foundByName = true;
            cnpjFoundByNameCount++;
            console.log(`[CNPJ Biz] ✓ Found ${cnpj} for ${lead.name} with similarity ${bizResult.similarity.toFixed(2)}`);
          } else {
            // Fallback to Google CSE + OpenCNPJ
            console.log(`[CNPJ Biz] Not found or low similarity, trying Google CSE...`);
            
            setProgress({ 
              current: i + 1, 
              total: leads.length, 
              status: `🔍 Buscando CNPJ (CSE): ${lead.name.substring(0, 25)}...`,
              step: 'searching_cnpj'
            });
            
            const cseResult = await buscarCNPJPorNome(lead.name, city, state, lead.address);
            
            if (cseResult.cnpj && cseResult.similarity >= 0.45) {
              cnpj = cseResult.cnpj;
              cnpjData = cseResult;
              foundByName = true;
              cnpjFoundByNameCount++;
              console.log(`[Google CSE] ✓ Found ${cnpj} for ${lead.name} with similarity ${cseResult.similarity.toFixed(2)}`);
            } else if (cseResult.cnpj) {
              console.log(`[Google CSE] Rejected ${cseResult.cnpj} - similarity too low: ${cseResult.similarity.toFixed(2)}`);
            }
          }
          
          // Small delay between CNPJ searches
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // If still no CNPJ, mark as not enriched
        if (!cnpj) {
          enrichedLeads.push({
            ...lead,
            enriched: false,
            enrichmentError: 'CNPJ não encontrado'
          });
          continue;
        }
        
        // Use data from the search result (already includes QSA from OpenCNPJ)
        if (cnpjData && cnpjData.qsa && cnpjData.qsa.length > 0) {
          setProgress({ 
            current: i + 1, 
            total: leads.length, 
            status: `📊 Processando sócios: ${lead.name.substring(0, 25)}...`,
            step: 'fetching_data'
          });
          
          // Process partners from QSA
          const socios: Socio[] = [];
          
          for (const s of cnpjData.qsa) {
            // BrasilAPI uses: 1=PJ, 2=PF; OpenCNPJ may vary
            // If identificador is 2 or if cnpj_cpf looks like CPF (11 digits or masked), treat as PF
            const identificador = Number(s.identificador_de_socio);
            const isPF = identificador === 2 || 
                        (s.cnpj_cpf_do_socio && s.cnpj_cpf_do_socio.replace(/\D/g, '').length === 11);
            
            const socio: Socio = {
              nome: s.nome_socio,
              qualificacao: s.qualificacao_socio,
              dataEntrada: s.data_entrada_sociedade,
              tipo: isPF ? 'PF' : 'PJ',
              telefonesEncontrados: [],
              fontesTelefones: []
            };
            
            // Search partner phones if enabled and partner is a person (PF)
            if (buscarTelefonesSocios && socio.tipo === 'PF') {
              setProgress({ 
                current: i + 1, 
                total: leads.length, 
                status: `📞 Buscando telefone (multi-camadas): ${socio.nome.substring(0, 20)}...`,
                step: 'searching_phones'
              });
              
              const { telefones, fontes, confiabilidades, tipos } = await buscarTelefonesSocio(
                socio.nome,
                cnpjData.municipio || '',
                cnpjData.uf || '',
                cnpjData.nome_fantasia || cnpjData.razao_social || lead.name,
                cnpjData.cnpj || ''
              );
              
              socio.telefonesEncontrados = telefones;
              socio.fontesTelefones = fontes;
              socio.confiabilidadesTelefones = confiabilidades;
              socio.tiposTelefones = tipos;
              
              // Delay between phone searches to avoid rate limiting
              if (telefones.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
            
            socios.push(socio);
          }
          
          // Format official phones
          const telefonesOficiais: string[] = [];
          if (cnpjData.telefone_1) {
            telefonesOficiais.push(formatarTelefoneBR(cnpjData.telefone_1));
          }
          if (cnpjData.telefone_2) {
            telefonesOficiais.push(formatarTelefoneBR(cnpjData.telefone_2));
          }
          
          // Enriched lead with data from OpenCNPJ
          enrichedLeads.push({
            ...lead,
            cnpj: cnpjData.cnpj,
            razaoSocial: cnpjData.razao_social,
            nomeFantasia: cnpjData.nome_fantasia || cnpjData.razao_social,
            email_oficial: cnpjData.email || undefined,
            telefones_oficiais: telefonesOficiais.length > 0 ? telefonesOficiais : undefined,
            situacao_cadastral: cnpjData.situacao,
            porte: cnpjData.porte,
            capital_social: cnpjData.capital_social,
            socios,
            enriched: true,
            cnpjFoundByName: foundByName
          });
        } else {
          // If no QSA data from search, try BrasilAPI as fallback
          setProgress({ 
            current: i + 1, 
            total: leads.length, 
            status: `📊 Consultando BrasilAPI: ${lead.name.substring(0, 25)}...`,
            step: 'fetching_data'
          });
          
          try {
            const cleanCNPJ = cnpj.replace(/\D/g, '');
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
            
            if (!response.ok) {
              throw new Error('CNPJ não encontrado');
            }
            
            const data = await response.json();
            
            // Process partners (QSA)
            const socios: Socio[] = [];
            
            for (const s of (data.qsa || [])) {
              // BrasilAPI uses: 1=PJ, 2=PF
              const identificador = Number(s.identificador_de_socio);
              const isPF = identificador === 2 || 
                          (s.cnpj_cpf_do_socio && s.cnpj_cpf_do_socio.replace(/\D/g, '').length === 11);
              
              const socio: Socio = {
                nome: s.nome_socio,
                qualificacao: s.qualificacao_socio,
                dataEntrada: s.data_entrada_sociedade,
                tipo: isPF ? 'PF' : 'PJ',
                telefonesEncontrados: [],
                fontesTelefones: []
              };
              
              // Search partner phones if enabled and partner is a person (PF)
              if (buscarTelefonesSocios && socio.tipo === 'PF') {
                setProgress({ 
                  current: i + 1, 
                  total: leads.length, 
                  status: `📞 Buscando telefone (multi-camadas): ${socio.nome.substring(0, 20)}...`,
                  step: 'searching_phones'
                });
                
                const { telefones, fontes, confiabilidades, tipos } = await buscarTelefonesSocio(
                  socio.nome,
                  data.municipio || '',
                  data.uf || '',
                  data.nome_fantasia || data.razao_social || lead.name,
                  data.cnpj || ''
                );
                
                socio.telefonesEncontrados = telefones;
                socio.fontesTelefones = fontes;
                socio.confiabilidadesTelefones = confiabilidades;
                socio.tiposTelefones = tipos;
                
                // Delay between phone searches
                if (telefones.length > 0) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                  await new Promise(resolve => setTimeout(resolve, 300));
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
            
            // Enriched lead from BrasilAPI
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
              enriched: true,
              cnpjFoundByName: foundByName
            });
          } catch (fallbackError) {
            console.error(`Error fetching from BrasilAPI for ${lead.name}:`, fallbackError);
            enrichedLeads.push({
              ...lead,
              enriched: false,
              enrichmentError: 'Erro ao consultar dados do CNPJ'
            });
          }
        }
        
      } catch (error) {
        console.error(`Error enriching ${lead.name}:`, error);
        enrichedLeads.push({
          ...lead,
          enriched: false,
          enrichmentError: 'Erro ao consultar dados'
        });
      }
      
      // Delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setProgress({ current: leads.length, total: leads.length, status: '✅ Enriquecimento concluído!', step: 'done' });
    setIsEnriching(false);
    
    console.log(`Enrichment complete. CNPJs found by name: ${cnpjFoundByNameCount}`);
    
    return enrichedLeads;
  }, [extractCNPJ, extractCityState, buscarCNPJBiz, buscarCNPJPorNome, formatarTelefoneBR, buscarTelefonesSocio]);

  // Calculate enrichment metrics
  const calculateMetrics = useCallback((leads: Lead[]): EnrichmentMetrics => {
    const enriched = leads.filter(l => l.enriched).length;
    const withEmail = leads.filter(l => l.email_oficial).length;
    const totalSocios = leads.reduce((acc, l) => acc + (l.socios?.length || 0), 0);
    const phonesFound = leads.reduce((acc, l) => acc + (l.telefones_oficiais?.length || 0), 0);
    const failed = leads.filter(l => l.enriched === false && l.enrichmentError).length;
    
    // Metrics for partner phones
    const sociosWithPhone = leads.reduce((acc, l) => {
      return acc + (l.socios?.filter(s => s.telefonesEncontrados && s.telefonesEncontrados.length > 0).length || 0);
    }, 0);
    
    const totalPartnerPhones = leads.reduce((acc, l) => {
      return acc + (l.socios?.reduce((sAcc, s) => sAcc + (s.telefonesEncontrados?.length || 0), 0) || 0);
    }, 0);
    
    // New metric: CNPJs found by company name search
    const cnpjFoundByName = leads.filter(l => l.cnpjFoundByName).length;
    
    return { enriched, withEmail, totalSocios, phonesFound, failed, sociosWithPhone, totalPartnerPhones, cnpjFoundByName };
  }, []);

  return {
    enriquecerLeads,
    isEnriching,
    progress,
    calculateMetrics
  };
}
