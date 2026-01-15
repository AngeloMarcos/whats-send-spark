import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CNPJ_BIZ_API_KEY = Deno.env.get('CNPJ_BIZ_API_KEY');

// CNPJ Biz was migrated under the CNPJws umbrella. Commercial API base URL:
// Docs: https://docs.cnpj.ws/en/api-reference/api-comercial
const CNPJ_BIZ_BASE_URL = 'https://comercial.cnpj.ws';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Shape expected by the frontend (src/lib/cnpjBizClient.ts)
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

function pickFirstArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  // common wrappers
  return (
    payload.data ??
    payload.items ??
    payload.resultados ??
    payload.empresas ??
    payload.results ??
    []
  );
}

function normalizeToCNPJBizResponse(payload: any): CNPJBizResponse | null {
  if (!payload || typeof payload !== 'object') return null;

  // The commercial API returns nested objects. We map defensively.
  const estabelecimento = payload.estabelecimento ?? payload.establishment ?? payload.empresa ?? {};
  const municipioObj = estabelecimento.municipio ?? estabelecimento.cidade ?? estabelecimento.city ?? {};

  const cnpj = (
    estabelecimento.cnpj ??
    payload.cnpj ??
    payload.cnpj_completo ??
    payload.cnpj_completo_formatado ??
    payload.cnpj_formatado
  );

  const razao_social = payload.razao_social ?? payload.razao ?? payload.nome ?? '';
  const nome_fantasia = estabelecimento.nome_fantasia ?? payload.nome_fantasia ?? '';

  // Phones can come in multiple fields
  const telefone =
    estabelecimento.telefone ??
    estabelecimento.ddd_telefone_1 ??
    estabelecimento.telefone_1 ??
    estabelecimento.telefone1 ??
    payload.telefone ??
    '';

  const email = estabelecimento.email ?? payload.email ?? '';

  const municipio =
    municipioObj.nome ??
    municipioObj.municipio ??
    estabelecimento.municipio ??
    payload.municipio ??
    '';

  const uf =
    municipioObj.uf ??
    municipioObj.estado ??
    estabelecimento.uf ??
    payload.uf ??
    '';

  const situacao_cadastral =
    estabelecimento.situacao_cadastral ??
    estabelecimento.situacao ??
    payload.situacao_cadastral ??
    payload.situacao ??
    '';

  const data_situacao_cadastral =
    estabelecimento.data_situacao_cadastral ??
    payload.data_situacao_cadastral ??
    '';

  const porte = payload.porte ?? '';
  const natureza_juridica = payload.natureza_juridica ?? '';
  const capital_social = Number(payload.capital_social ?? 0);

  const data_inicio_atividade =
    estabelecimento.data_inicio_atividade ??
    payload.data_inicio_atividade ??
    payload.data_abertura ??
    '';

  const socios = payload.socios ?? payload.qsa ?? payload.quadro_societario ?? [];
  const qsa = Array.isArray(socios)
    ? socios.map((s: any) => ({
        nome: s.nome ?? s.nome_socio ?? '',
        qualificacao: s.qualificacao ?? s.qualificacao_socio ?? '',
        pais_origem: s.pais_origem ?? '',
        representante_legal: s.representante_legal ?? '',
        nome_representante: s.nome_representante ?? '',
        qualificacao_representante: s.qualificacao_representante ?? '',
      }))
    : [];

  if (!cnpj || !razao_social) return null;

  return {
    status: 'OK',
    cnpj: String(cnpj),
    razao_social: String(razao_social),
    nome_fantasia: String(nome_fantasia ?? ''),
    situacao_cadastral: String(situacao_cadastral ?? ''),
    data_situacao_cadastral: String(data_situacao_cadastral ?? ''),
    porte: String(porte ?? ''),
    natureza_juridica: String(natureza_juridica ?? ''),
    capital_social: Number.isFinite(capital_social) ? capital_social : 0,
    municipio: String(municipio ?? ''),
    uf: String(uf ?? ''),
    email: String(email ?? ''),
    telefone: String(telefone ?? ''),
    data_inicio_atividade: String(data_inicio_atividade ?? ''),
    qsa,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, cnpj, companyName } = await req.json();
    console.log(`[cnpj-biz] Base URL: ${CNPJ_BIZ_BASE_URL}`);
    console.log(`[cnpj-biz] Action: ${action}, CNPJ: ${cnpj}, Company: ${companyName}`);

    if (!CNPJ_BIZ_API_KEY) {
      console.error('[cnpj-biz] API key not configured');
      return new Response(
        JSON.stringify({ error: 'CNPJ Biz API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: CNPJBizResponse | null = null;

    // Debug: log if API key is present (not the value)
    console.log(`[cnpj-biz] API key configured: ${CNPJ_BIZ_API_KEY ? 'yes (length: ' + CNPJ_BIZ_API_KEY.length + ')' : 'NO'}`);

    // Special action to test token validity
    if (action === 'test-token') {
      const testUrl = `${CNPJ_BIZ_BASE_URL}/consumo?token=${CNPJ_BIZ_API_KEY}`;
      console.log(`[cnpj-biz] Testing token at: ${CNPJ_BIZ_BASE_URL}/consumo`);
      const res = await fetch(testUrl, { method: 'GET' });
      const txt = await res.text();
      console.log(`[cnpj-biz] Token test result: ${res.status} - ${txt.substring(0, 200)}`);
      return new Response(
        JSON.stringify({ status: res.status, body: txt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'fetch' && cnpj) {
      // Fetch by CNPJ
      const cleanCNPJ = String(cnpj).replace(/\D/g, '');
      console.log(`[cnpj-biz] Fetching CNPJ: ${cleanCNPJ}`);

      // Use token as query param (alternative auth method per docs)
      const fetchUrl = `${CNPJ_BIZ_BASE_URL}/cnpj/${cleanCNPJ}?token=${CNPJ_BIZ_API_KEY}`;
      console.log(`[cnpj-biz] Fetching URL: ${CNPJ_BIZ_BASE_URL}/cnpj/${cleanCNPJ}?token=***`);
      
      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
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

      const payload = await res.json();
      result = normalizeToCNPJBizResponse(payload);
      console.log(`[cnpj-biz] Fetch success for ${cleanCNPJ}. Normalized: ${result ? 'yes' : 'no'}`);

    } else if (action === 'search' && companyName) {
      // Search by company name (we only filter by razao_social; city/state require cidade_id)
      // Use token as query param (alternative auth method per docs)
      const searchParams = new URLSearchParams({ 
        razao_social: String(companyName),
        token: CNPJ_BIZ_API_KEY || ''
      });
      const searchUrl = `${CNPJ_BIZ_BASE_URL}/pesquisa?${searchParams}`;
      console.log(`[cnpj-biz] Searching: ${CNPJ_BIZ_BASE_URL}/pesquisa?razao_social=${encodeURIComponent(companyName)}&token=***`);

      const res = await fetch(searchUrl, {
        method: 'GET',
        headers: {
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

      const payload = await res.json();
      const items = pickFirstArray(payload);
      const first = items[0] ?? null;
      result = normalizeToCNPJBizResponse(first);
      console.log(`[cnpj-biz] Search results: ${items.length}. Normalized: ${result ? 'yes' : 'no'}`);

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
