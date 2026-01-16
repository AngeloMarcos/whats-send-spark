import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CNPJ_BIZ_API_KEY = Deno.env.get('CNPJ_BIZ_API_KEY');

// API URLs - Multi-layer fallback
const BRASIL_API_URL = 'https://brasilapi.com.br/api/cnpj/v1';
const RECEITAWS_URL = 'https://receitaws.com.br/v1/cnpj';
const CNPJ_BIZ_BASE_URL = 'https://api.cnpjbiz.com.br/api/v1';

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
  source?: string; // Added to track which API was used
}

// Normalize Brasil API response
function normalizeBrasilAPI(data: any): CNPJBizResponse | null {
  if (!data || data.status === 404) return null;

  const qsa = Array.isArray(data.qsa)
    ? data.qsa.map((s: any) => ({
        nome: s.nome_socio || s.nome || '',
        qualificacao: s.qualificacao_socio || s.qualificacao || '',
        pais_origem: s.pais_origem || '',
        representante_legal: s.representante_legal || '',
        nome_representante: s.nome_representante || '',
        qualificacao_representante: s.qualificacao_representante || '',
      }))
    : [];

  // Format phones from Brasil API (ddd + telefone)
  let telefone = '';
  if (data.ddd_telefone_1) {
    telefone = data.ddd_telefone_1.replace(/\D/g, '');
  }

  return {
    status: 'OK',
    cnpj: data.cnpj || '',
    razao_social: data.razao_social || '',
    nome_fantasia: data.nome_fantasia || '',
    situacao_cadastral: data.descricao_situacao_cadastral || data.situacao_cadastral || '',
    data_situacao_cadastral: data.data_situacao_cadastral || '',
    porte: data.porte || data.descricao_porte || '',
    natureza_juridica: data.natureza_juridica || data.descricao_natureza_juridica || '',
    capital_social: Number(data.capital_social) || 0,
    municipio: data.municipio || '',
    uf: data.uf || '',
    email: data.email || '',
    telefone,
    data_inicio_atividade: data.data_inicio_atividade || '',
    qsa,
    source: 'brasil_api',
  };
}

// Normalize ReceitaWS response
function normalizeReceitaWS(data: any): CNPJBizResponse | null {
  if (!data || data.status === 'ERROR') return null;

  const qsa = Array.isArray(data.qsa)
    ? data.qsa.map((s: any) => ({
        nome: s.nome || '',
        qualificacao: s.qual || '',
        pais_origem: s.pais_origem || '',
        representante_legal: '',
        nome_representante: '',
        qualificacao_representante: '',
      }))
    : [];

  return {
    status: 'OK',
    cnpj: data.cnpj || '',
    razao_social: data.nome || '',
    nome_fantasia: data.fantasia || '',
    situacao_cadastral: data.situacao || '',
    data_situacao_cadastral: data.data_situacao || '',
    porte: data.porte || '',
    natureza_juridica: data.natureza_juridica || '',
    capital_social: Number(String(data.capital_social || '0').replace(/\./g, '').replace(',', '.')) || 0,
    municipio: data.municipio || '',
    uf: data.uf || '',
    email: data.email || '',
    telefone: data.telefone || '',
    data_inicio_atividade: data.abertura || '',
    qsa,
    source: 'receitaws',
  };
}

// Normalize CNPJ Biz response (original logic)
function normalizeCNPJBiz(payload: any): CNPJBizResponse | null {
  if (!payload || typeof payload !== 'object') return null;

  const estabelecimento = payload.estabelecimento ?? payload.establishment ?? payload.empresa ?? payload;
  const municipioObj = estabelecimento.municipio ?? estabelecimento.cidade ?? estabelecimento.city ?? {};

  const cnpj = (
    estabelecimento.cnpj ??
    payload.cnpj ??
    payload.cnpj_completo ??
    payload.cnpj_completo_formatado ??
    payload.cnpj_formatado
  );

  const razao_social = payload.razao_social ?? payload.razao ?? payload.nome ?? estabelecimento.razao_social ?? '';
  const nome_fantasia = estabelecimento.nome_fantasia ?? payload.nome_fantasia ?? '';

  const telefone =
    estabelecimento.telefone ??
    estabelecimento.ddd_telefone_1 ??
    estabelecimento.telefone_1 ??
    estabelecimento.telefone1 ??
    payload.telefone ??
    '';

  const email = estabelecimento.email ?? payload.email ?? '';

  const municipio =
    (typeof municipioObj === 'string' ? municipioObj : municipioObj.nome) ??
    municipioObj.municipio ??
    estabelecimento.municipio ??
    payload.municipio ??
    '';

  const uf =
    estabelecimento.uf ??
    municipioObj.uf ??
    municipioObj.estado ??
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

  const porte = payload.porte ?? estabelecimento.porte ?? '';
  const natureza_juridica = payload.natureza_juridica ?? estabelecimento.natureza_juridica ?? '';
  const capital_social = Number(payload.capital_social ?? estabelecimento.capital_social ?? 0);

  const data_inicio_atividade =
    estabelecimento.data_inicio_atividade ??
    payload.data_inicio_atividade ??
    payload.data_abertura ??
    estabelecimento.data_abertura ??
    '';

  const socios = payload.socios ?? payload.qsa ?? payload.quadro_societario ?? estabelecimento.socios ?? [];
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
    source: 'cnpj_biz',
  };
}

// Fetch CNPJ with multi-layer fallback
async function fetchCNPJWithFallback(cleanCNPJ: string): Promise<CNPJBizResponse | null> {
  const errors: string[] = [];

  // Layer 1: Brasil API (primary - most reliable, no auth needed)
  try {
    console.log(`[cnpj-biz] Trying Brasil API for ${cleanCNPJ}...`);
    const res = await fetch(`${BRASIL_API_URL}/${cleanCNPJ}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (res.ok) {
      const data = await res.json();
      const normalized = normalizeBrasilAPI(data);
      if (normalized && normalized.qsa.length > 0) {
        console.log(`[cnpj-biz] Brasil API success! Found ${normalized.qsa.length} sócios`);
        return normalized;
      } else if (normalized) {
        console.log(`[cnpj-biz] Brasil API returned data but no sócios, trying next source...`);
        // Continue to next source to try to get sócios
      }
    } else {
      const errorText = await res.text();
      errors.push(`Brasil API: ${res.status} - ${errorText}`);
      console.log(`[cnpj-biz] Brasil API failed: ${res.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Brasil API: ${msg}`);
    console.log(`[cnpj-biz] Brasil API error: ${msg}`);
  }

  // Layer 2: ReceitaWS (fallback)
  try {
    console.log(`[cnpj-biz] Trying ReceitaWS for ${cleanCNPJ}...`);
    const res = await fetch(`${RECEITAWS_URL}/${cleanCNPJ}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.status !== 'ERROR') {
        const normalized = normalizeReceitaWS(data);
        if (normalized && normalized.qsa.length > 0) {
          console.log(`[cnpj-biz] ReceitaWS success! Found ${normalized.qsa.length} sócios`);
          return normalized;
        } else if (normalized) {
          console.log(`[cnpj-biz] ReceitaWS returned data but no sócios, trying next source...`);
        }
      } else {
        errors.push(`ReceitaWS: ${data.message || 'Unknown error'}`);
        console.log(`[cnpj-biz] ReceitaWS error: ${data.message}`);
      }
    } else {
      const errorText = await res.text();
      errors.push(`ReceitaWS: ${res.status} - ${errorText}`);
      console.log(`[cnpj-biz] ReceitaWS failed: ${res.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`ReceitaWS: ${msg}`);
    console.log(`[cnpj-biz] ReceitaWS error: ${msg}`);
  }

  // Layer 3: CNPJ Biz (last resort - if API key is configured)
  if (CNPJ_BIZ_API_KEY) {
    try {
      console.log(`[cnpj-biz] Trying CNPJ Biz API for ${cleanCNPJ}...`);
      const res = await fetch(`${CNPJ_BIZ_BASE_URL}/cnpj/${cleanCNPJ}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CNPJ_BIZ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeCNPJBiz(data);
        if (normalized) {
          console.log(`[cnpj-biz] CNPJ Biz success! Found ${normalized.qsa.length} sócios`);
          return normalized;
        }
      } else {
        const errorText = await res.text();
        errors.push(`CNPJ Biz: ${res.status} - ${errorText}`);
        console.log(`[cnpj-biz] CNPJ Biz failed: ${res.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`CNPJ Biz: ${msg}`);
      console.log(`[cnpj-biz] CNPJ Biz error: ${msg}`);
    }
  }

  console.error(`[cnpj-biz] All sources failed for ${cleanCNPJ}:`, errors);
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, cnpj, companyName, city, state } = await req.json();
    console.log(`[cnpj-biz] Action: ${action}, CNPJ: ${cnpj}, Company: ${companyName}, City: ${city}, State: ${state}`);

    let result: CNPJBizResponse | null = null;

    if (action === 'fetch' && cnpj) {
      // Fetch by CNPJ with fallback
      const cleanCNPJ = String(cnpj).replace(/\D/g, '');
      console.log(`[cnpj-biz] Fetching CNPJ: ${cleanCNPJ} (using multi-layer fallback)`);

      result = await fetchCNPJWithFallback(cleanCNPJ);

      if (result) {
        console.log(`[cnpj-biz] Success! Source: ${result.source}, Sócios: ${result.qsa.length}`);
      } else {
        console.log(`[cnpj-biz] No data found for CNPJ ${cleanCNPJ}`);
      }

    } else if (action === 'search' && companyName) {
      // Search by company name - use CNPJ Biz if available, otherwise return error
      // Brasil API and ReceitaWS don't support search by name
      if (!CNPJ_BIZ_API_KEY) {
        console.log('[cnpj-biz] Search by name requires CNPJ Biz API key');
        return new Response(
          JSON.stringify({ 
            error: 'Search by name not available', 
            suggestion: 'Use Google Places or Serper to find the CNPJ first' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const params = new URLSearchParams({ q: String(companyName) });
      if (city) params.set('cidade', String(city));
      if (state) params.set('uf', String(state));

      const searchUrl = `${CNPJ_BIZ_BASE_URL}/search?${params.toString()}`;
      console.log(`[cnpj-biz] Searching: ${searchUrl}`);

      try {
        const res = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${CNPJ_BIZ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const payload = await res.json();
          const items = Array.isArray(payload) ? payload : 
            (payload.data ?? payload.items ?? payload.resultados ?? payload.empresas ?? payload.results ?? []);
          const first = items[0] ?? null;
          result = normalizeCNPJBiz(first);
          console.log(`[cnpj-biz] Search results: ${items.length}. Normalized: ${result ? 'yes' : 'no'}`);
        } else {
          const errorText = await res.text();
          console.error(`[cnpj-biz] Search error ${res.status}: ${errorText}`);
          return new Response(
            JSON.stringify({ error: `Search failed: ${res.status}`, details: errorText }),
            { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[cnpj-biz] Search network error: ${msg}`);
        return new Response(
          JSON.stringify({ error: 'Search service unavailable', details: msg }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
