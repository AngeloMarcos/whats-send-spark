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

// Extract CNPJs from text using regex
function extractCNPJsFromText(text: string): string[] {
  const regex = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
  const matches = text.match(regex) || [];
  
  // Normalize to 14 digits and deduplicate
  const normalized = matches
    .map(m => m.replace(/\D/g, ''))
    .filter(cnpj => cnpj.length === 14);
  
  return [...new Set(normalized)];
}

// Validate CNPJ checksum
function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Calculate first check digit
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cleaned[12]) !== digit1) return false;
  
  // Calculate second check digit
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(cleaned[13]) === digit2;
}

// Delay helper
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

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

    console.log(`[search-cnpj-by-name] Searching for: ${companyName}, City: ${city}, State: ${state}`);

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID');

    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      console.error('[search-cnpj-by-name] Missing Google API configuration');
      return new Response(
        JSON.stringify({ 
          cnpj: null, 
          similarity: 0,
          message: 'Configuração de API não encontrada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query for Google Custom Search
    const locationStr = city && state ? `${city} ${state}` : (city || state || '');
    const searchQuery = `"${companyName}" ${locationStr} CNPJ site:cnpj.ws OR site:casadosdados.com.br OR site:cnpja.com`;
    
    console.log(`[Google CSE] Query: ${searchQuery}`);

    // Search using Google Custom Search API
    const googleUrl = new URL('https://www.googleapis.com/customsearch/v1');
    googleUrl.searchParams.set('key', GOOGLE_API_KEY);
    googleUrl.searchParams.set('cx', GOOGLE_CSE_ID);
    googleUrl.searchParams.set('q', searchQuery);
    googleUrl.searchParams.set('num', '5');
    googleUrl.searchParams.set('gl', 'br');
    googleUrl.searchParams.set('lr', 'lang_pt');

    const googleResponse = await fetch(googleUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!googleResponse.ok) {
      console.error(`[Google CSE] Error: ${googleResponse.status} - ${await googleResponse.text()}`);
      return new Response(
        JSON.stringify({ 
          cnpj: null, 
          similarity: 0,
          message: 'Erro na busca do Google' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleData = await googleResponse.json();
    const items = googleData.items || [];
    
    console.log(`[Google CSE] Found ${items.length} results`);

    // Extract CNPJs from all results
    const allCNPJs: string[] = [];
    
    for (const item of items) {
      const textToSearch = `${item.title || ''} ${item.snippet || ''} ${item.link || ''}`;
      const cnpjs = extractCNPJsFromText(textToSearch);
      allCNPJs.push(...cnpjs);
    }

    // Deduplicate and validate CNPJs
    const uniqueCNPJs = [...new Set(allCNPJs)].filter(isValidCNPJ);
    
    console.log(`[search-cnpj-by-name] Found ${uniqueCNPJs.length} valid CNPJs: ${uniqueCNPJs.join(', ')}`);

    if (uniqueCNPJs.length === 0) {
      return new Response(
        JSON.stringify({ 
          cnpj: null, 
          similarity: 0,
          message: 'Nenhum CNPJ encontrado nos resultados da busca' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each CNPJ with OpenCNPJ API and find best match
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const cnpj of uniqueCNPJs.slice(0, 3)) { // Limit to 3 to avoid rate limiting
      try {
        console.log(`[OpenCNPJ] Validating CNPJ: ${cnpj}`);
        
        const openCnpjUrl = `https://api.opencnpj.org/${cnpj}`;
        const cnpjResponse = await fetch(openCnpjUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          }
        });

        if (!cnpjResponse.ok) {
          console.log(`[OpenCNPJ] CNPJ ${cnpj} not found or invalid`);
          await delay(300);
          continue;
        }

        const cnpjData = await cnpjResponse.json();
        
        // Calculate similarity with both names
        const simRazao = calculateSimilarity(companyName, cnpjData.razao_social || '');
        const simFantasia = calculateSimilarity(companyName, cnpjData.nome_fantasia || '');
        const maxSim = Math.max(simRazao, simFantasia);

        console.log(`[OpenCNPJ] ${cnpj}: razao="${cnpjData.razao_social}", fantasia="${cnpjData.nome_fantasia}", similarity=${maxSim.toFixed(2)}`);

        // Check location match for bonus
        let locationBonus = 0;
        if (city && cnpjData.municipio) {
          const cityNorm = normalizeName(city);
          const muniNorm = normalizeName(cnpjData.municipio);
          if (cityNorm === muniNorm || cityNorm.includes(muniNorm) || muniNorm.includes(cityNorm)) {
            locationBonus = 0.1;
          }
        }
        
        const finalSimilarity = Math.min(maxSim + locationBonus, 1);

        if (finalSimilarity > bestSimilarity) {
          bestSimilarity = finalSimilarity;
          bestMatch = {
            cnpj: cnpjData.cnpj || cnpj,
            razao_social: cnpjData.razao_social,
            nome_fantasia: cnpjData.nome_fantasia,
            municipio: cnpjData.municipio,
            uf: cnpjData.uf,
            situacao: cnpjData.descricao_situacao_cadastral || cnpjData.situacao_cadastral,
            porte: cnpjData.porte,
            capital_social: cnpjData.capital_social,
            email: cnpjData.email,
            telefone_1: cnpjData.ddd_telefone_1,
            telefone_2: cnpjData.ddd_telefone_2,
            qsa: cnpjData.qsa || [],
            similarity: finalSimilarity
          };
        }

        await delay(300); // Rate limiting for OpenCNPJ
      } catch (error) {
        console.error(`[OpenCNPJ] Error validating ${cnpj}:`, error);
        await delay(300);
      }
    }

    // Only return if similarity is above threshold (55%)
    if (bestMatch && bestSimilarity >= 0.55) {
      console.log(`[search-cnpj-by-name] Best match: ${bestMatch.cnpj} with similarity ${bestSimilarity.toFixed(2)}`);
      
      return new Response(
        JSON.stringify({
          ...bestMatch,
          message: 'CNPJ encontrado com sucesso'
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
    console.error('[search-cnpj-by-name] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
