import { supabase } from '@/integrations/supabase/client';

export interface CNPJBizResponse {
  status: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string;
  porte: string;
  natureza_juridica: string;
  capital_social: number;
  municipio: string;
  uf: string;
  email: string;
  telefone: string;
  data_inicio_atividade: string;
  qsa: Array<{
    nome: string;
    qualificacao: string;
    pais_origem: string;
    representante_legal: string;
    nome_representante: string;
    qualificacao_representante: string;
  }>;
}

/**
 * Fetch CNPJ data from CNPJ Biz API via edge function
 */
export async function fetchCNPJBiz(cnpj: string): Promise<CNPJBizResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke('cnpj-biz', {
      body: { action: 'fetch', cnpj },
    });

    if (error) {
      console.error('Error calling cnpj-biz function:', error);
      return null;
    }

    return data?.data || null;
  } catch (error) {
    console.error('Error fetching from CNPJ Biz:', error);
    return null;
  }
}

/**
 * Search for a company by name using CNPJ Biz API via edge function
 */
export async function searchCNPJByName(
  companyName: string,
  city?: string,
  state?: string
): Promise<CNPJBizResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke('cnpj-biz', {
      body: { action: 'search', companyName, city, state },
    });

    if (error) {
      console.error('Error calling cnpj-biz search:', error);
      return null;
    }

    return data?.data || null;
  } catch (error) {
    console.error('Error searching CNPJ by name:', error);
    return null;
  }
}
