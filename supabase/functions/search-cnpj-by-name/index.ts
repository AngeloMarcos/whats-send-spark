import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize company name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\b(ltda|me|epp|eireli|s\.?a\.?|ss|sociedade simples|microempresa|empresa individual)\b/gi, '')
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate similarity between two strings (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  // Check if one contains the other
  if (longer.includes(shorter) || shorter.includes(longer)) {
    return 0.85;
  }
  
  // Calculate Levenshtein distance
  const matrix: number[][] = [];
  
  for (let i = 0; i <= shorter.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= longer.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= shorter.length; i++) {
    for (let j = 1; j <= longer.length; j++) {
      if (shorter[i - 1] === longer[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[shorter.length][longer.length];
  return 1 - (distance / longer.length);
}

// Extract city and state from address
function extractLocation(address: string): { city: string; state: string } {
  // Try to extract state abbreviation
  const stateMatch = address.match(/\b([A-Z]{2})\b(?:\s*[-,]|\s*$|\s+\d{5})/);
  const state = stateMatch ? stateMatch[1] : '';
  
  // Try to extract city (usually before state or after "-")
  const parts = address.split(/[-,]/);
  let city = '';
  
  for (const part of parts) {
    const cleaned = part.trim();
    if (cleaned.length > 3 && !cleaned.match(/^\d/) && cleaned !== state) {
      // Check if it looks like a city name
      if (!cleaned.match(/^(R\.|Rua|Av\.|Avenida|Al\.|Alameda|Pç\.|Praça)/i)) {
        city = cleaned;
      }
    }
  }
  
  return { city, state };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, city, state, address } = await req.json();

    if (!companyName) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching CNPJ for: ${companyName}, City: ${city}, State: ${state}`);

    // Extract location from address if city/state not provided
    let searchCity = city || '';
    let searchState = state || '';
    
    if ((!searchCity || !searchState) && address) {
      const extracted = extractLocation(address);
      searchCity = searchCity || extracted.city;
      searchState = searchState || extracted.state;
    }

    // Clean company name for search
    const normalizedSearch = normalizeName(companyName);
    console.log(`Normalized search: ${normalizedSearch}`);

    // Use Casa dos Dados API (public, no key needed)
    // Format: POST with search parameters
    const searchUrl = 'https://casadosdados.com.br/api/v2/public/cnpj/search';
    
    const searchBody = {
      query: {
        termo: [normalizedSearch],
        uf: searchState ? [searchState] : [],
        municipio: searchCity ? [searchCity.toUpperCase()] : [],
        situacao_cadastral: ['ATIVA'],
        atividade_principal: [],
        natureza_juridica: [],
        cep: [],
        ddd: []
      },
      range_query: {
        data_abertura: { lte: null, gte: null },
        capital_social: { lte: null, gte: null }
      },
      extras: {
        somente_mei: false,
        excluir_mei: false,
        com_email: false,
        incluir_atividade_secundaria: false,
        com_contato_telefonico: false,
        somente_fixo: false,
        somente_celular: false,
        somente_matriz: false,
        somente_filial: false
      },
      page: 1
    };

    console.log('Calling Casa dos Dados API...');
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://casadosdados.com.br',
        'Referer': 'https://casadosdados.com.br/solucao/cnpj'
      },
      body: JSON.stringify(searchBody)
    });

    if (!response.ok) {
      console.log(`Casa dos Dados returned status: ${response.status}`);
      
      // Fallback: try alternative API (CNPJ.ws) with simpler search
      const fallbackUrl = `https://www.receitaws.com.br/v1/cnpj/${encodeURIComponent(normalizedSearch)}`;
      console.log('Trying fallback search...');
      
      // Since ReceitaWS needs a CNPJ, we'll return no result
      return new Response(
        JSON.stringify({ 
          cnpj: null, 
          similarity: 0,
          message: 'Empresa não encontrada na base de dados' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Found ${data.data?.count || 0} results`);

    if (!data.data?.cnpj || data.data.cnpj.length === 0) {
      return new Response(
        JSON.stringify({ 
          cnpj: null, 
          similarity: 0,
          message: 'Nenhuma empresa encontrada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find best match by similarity
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const empresa of data.data.cnpj) {
      // Calculate similarity with both razao_social and nome_fantasia
      const simRazao = calculateSimilarity(companyName, empresa.razao_social || '');
      const simFantasia = calculateSimilarity(companyName, empresa.nome_fantasia || '');
      const maxSim = Math.max(simRazao, simFantasia);

      console.log(`Comparing: ${empresa.nome_fantasia || empresa.razao_social} - Similarity: ${maxSim.toFixed(2)}`);

      if (maxSim > bestSimilarity) {
        bestSimilarity = maxSim;
        bestMatch = empresa;
      }
    }

    // Only return if similarity is above threshold (60%)
    if (bestMatch && bestSimilarity >= 0.6) {
      console.log(`Best match: ${bestMatch.cnpj} with similarity ${bestSimilarity.toFixed(2)}`);
      
      return new Response(
        JSON.stringify({
          cnpj: bestMatch.cnpj,
          razao_social: bestMatch.razao_social,
          nome_fantasia: bestMatch.nome_fantasia,
          municipio: bestMatch.municipio,
          uf: bestMatch.uf,
          similarity: bestSimilarity,
          situacao: bestMatch.situacao_cadastral
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        cnpj: null, 
        similarity: bestSimilarity,
        message: 'Nenhuma correspondência encontrada com similaridade suficiente' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in search-cnpj-by-name:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});