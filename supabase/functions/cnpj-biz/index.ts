import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CNPJ_BIZ_API_KEY = Deno.env.get('CNPJ_BIZ_API_KEY');
const CNPJ_BIZ_BASE_URL = 'https://api.cnpjbiz.com.br/api';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CNPJBizResponse {
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, cnpj, companyName, city, state } = await req.json();
    console.log(`[cnpj-biz] Action: ${action}, CNPJ: ${cnpj}, Company: ${companyName}`);

    if (!CNPJ_BIZ_API_KEY) {
      console.error('[cnpj-biz] API key not configured');
      return new Response(
        JSON.stringify({ error: 'CNPJ Biz API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: CNPJBizResponse | CNPJBizResponse[] | null = null;

    if (action === 'fetch' && cnpj) {
      // Fetch by CNPJ
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      console.log(`[cnpj-biz] Fetching CNPJ: ${cleanCNPJ}`);
      
      const res = await fetch(`${CNPJ_BIZ_BASE_URL}/${cleanCNPJ}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CNPJ_BIZ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[cnpj-biz] Fetch error ${res.status}: ${errorText}`);
        return new Response(
          JSON.stringify({ error: `CNPJ Biz API error: ${res.status}`, details: errorText }),
          { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = await res.json();
      console.log(`[cnpj-biz] Fetch success for ${cleanCNPJ}`);
      
    } else if (action === 'search' && companyName) {
      // Search by company name
      const params = new URLSearchParams({ q: companyName });
      if (city) params.append('cidade', city);
      if (state) params.append('uf', state);
      
      console.log(`[cnpj-biz] Searching: ${companyName}, city: ${city}, state: ${state}`);
      
      const res = await fetch(`${CNPJ_BIZ_BASE_URL}/search?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CNPJ_BIZ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[cnpj-biz] Search error ${res.status}: ${errorText}`);
        return new Response(
          JSON.stringify({ error: `CNPJ Biz search error: ${res.status}`, details: errorText }),
          { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await res.json();
      result = data.empresas?.[0] || null;
      console.log(`[cnpj-biz] Search found: ${result ? 'yes' : 'no'}`);
      
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "fetch" with cnpj or "search" with companyName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cnpj-biz] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
