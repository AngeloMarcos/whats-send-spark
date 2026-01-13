import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common business type words to remove from search
const BUSINESS_WORDS = [
  'clinica', 'hospital', 'centro', 'servicos', 'comercio', 'loja', 'mercado',
  'restaurante', 'bar', 'padaria', 'farmacia', 'consultorio', 'escritorio',
  'academia', 'pet', 'shop', 'store', 'auto', 'mecanica', 'oficina',
  'laboratorio', 'analises', 'clinicas', 'medica', 'odontologica', 'dentario',
  'implantes', 'aparelho', 'dentista', 'dr', 'dra', 'doutor', 'doutora'
];

// Location suffixes to remove
const LOCATION_PATTERNS = [
  /\s*-\s*[a-zA-ZÀ-ÿ\s]+$/i,  // "- City Name" or "- Neighborhood"
  /\s*\|\s*[a-zA-ZÀ-ÿ\s,]+$/i, // "| City Name, Neighborhood - SP"
  /\s*,\s*[a-zA-ZÀ-ÿ\s]+\s*-\s*[A-Z]{2}$/i, // ", Neighborhood - SP"
];

// Clean and simplify company name for better search
function simplifyCompanyName(name: string): string {
  let simplified = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents
  
  // Remove location patterns
  for (const pattern of LOCATION_PATTERNS) {
    simplified = simplified.replace(pattern, '');
  }
  
  // Remove business type words
  for (const word of BUSINESS_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    simplified = simplified.replace(regex, '');
  }
  
  // Remove legal entity suffixes
  simplified = simplified
    .replace(/\b(ltda|me|epp|eireli|s\.?a\.?|ss|sociedade simples|microempresa|empresa individual)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return simplified;
}

// Extract main business name (first significant word/phrase)
function extractMainName(name: string): string {
  const simplified = simplifyCompanyName(name);
  const words = simplified.split(' ').filter(w => w.length > 2);
  
  // Return first 2-3 significant words
  return words.slice(0, 3).join(' ');
}

// Normalize company name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(ltda|me|epp|eireli|s\.?a\.?|ss|sociedade simples|microempresa|empresa individual)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate similarity between two strings (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);
  
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  // Check if one contains the other
  if (longer.includes(shorter) || shorter.includes(longer)) {
    return 0.85;
  }
  
  // Check word-level match
  const words1 = s1.split(' ').filter(w => w.length > 2);
  const words2 = s2.split(' ').filter(w => w.length > 2);
  
  const matchingWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  if (matchingWords.length > 0) {
    const wordMatchRatio = matchingWords.length / Math.min(words1.length, words2.length);
    if (wordMatchRatio >= 0.5) {
      return 0.7 + (wordMatchRatio * 0.2);
    }
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
  
  const normalized = matches
    .map(m => m.replace(/\D/g, ''))
    .filter(cnpj => cnpj.length === 14);
  
  return [...new Set(normalized)];
}

// Validate CNPJ checksum
function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cleaned[12]) !== digit1) return false;
  
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

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Search sites configuration - expanded list
const SEARCH_SITES = 'site:cnpj.ws OR site:casadosdados.com.br OR site:cnpja.com OR site:empresaqui.com.br OR site:speedio.com.br OR site:consultacnpj.com.br';

// Build multiple search queries (progressive search)
function buildSearchQueries(companyName: string, city?: string, state?: string): string[] {
  const queries: string[] = [];
  const locationStr = city && state ? `${city} ${state}` : (city || state || '');
  
  // Query 1: Exact name with location
  queries.push(`"${companyName}" ${locationStr} CNPJ ${SEARCH_SITES}`);
  
  // Query 2: Simplified name (without location suffixes) with location
  const simplified = simplifyCompanyName(companyName);
  if (simplified && simplified !== companyName.toLowerCase()) {
    queries.push(`"${simplified}" ${locationStr} CNPJ ${SEARCH_SITES}`);
  }
  
  // Query 3: Main name only with location
  const mainName = extractMainName(companyName);
  if (mainName && mainName.length >= 3 && mainName !== simplified) {
    queries.push(`"${mainName}" ${locationStr} CNPJ ${SEARCH_SITES}`);
  }
  
  // Query 4: Simplified name without location filter (broader search)
  if (simplified) {
    queries.push(`"${simplified}" CNPJ ${SEARCH_SITES}`);
  }
  
  return queries;
}

// Execute Google CSE search
async function searchGoogleCSE(
  query: string, 
  apiKey: string, 
  cseId: string
): Promise<{ items: any[], error?: string }> {
  try {
    const googleUrl = new URL('https://www.googleapis.com/customsearch/v1');
    googleUrl.searchParams.set('key', apiKey);
    googleUrl.searchParams.set('cx', cseId);
    googleUrl.searchParams.set('q', query);
    googleUrl.searchParams.set('num', '5');
    googleUrl.searchParams.set('gl', 'br');
    googleUrl.searchParams.set('lr', 'lang_pt');

    const response = await fetch(googleUrl.toString(), {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Google CSE] HTTP ${response.status}: ${errorText}`);
      return { items: [], error: errorText };
    }

    const data = await response.json();
    return { items: data.items || [] };
  } catch (error) {
    console.error('[Google CSE] Fetch error:', error);
    return { items: [], error: String(error) };
  }
}

// Try BrasilAPI as fallback
async function tryBrasilAPI(cnpj: string): Promise<any | null> {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      cnpj: data.cnpj,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia,
      municipio: data.municipio,
      uf: data.uf,
      situacao: data.descricao_situacao_cadastral,
      porte: data.porte,
      capital_social: data.capital_social,
      email: data.email,
      telefone_1: data.ddd_telefone_1,
      telefone_2: data.ddd_telefone_2,
      qsa: data.qsa || []
    };
  } catch (error) {
    console.error(`[BrasilAPI] Error fetching ${cnpj}:`, error);
    return null;
  }
}

// Validate CNPJ with OpenCNPJ API and ensure QSA is populated
async function validateWithOpenCNPJ(cnpj: string): Promise<any | null> {
  try {
    const response = await fetch(`https://api.opencnpj.org/${cnpj}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      }
    });

    if (!response.ok) {
      // Try BrasilAPI as fallback
      console.log(`[OpenCNPJ] Failed for ${cnpj}, trying BrasilAPI...`);
      return await tryBrasilAPI(cnpj);
    }

    const data = await response.json();
    
    let result = {
      cnpj: data.cnpj || cnpj,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia,
      municipio: data.municipio,
      uf: data.uf,
      situacao: data.descricao_situacao_cadastral || data.situacao_cadastral,
      porte: data.porte,
      capital_social: typeof data.capital_social === 'number' ? data.capital_social : parseFloat(String(data.capital_social || '0').replace(/[^\d.]/g, '')) || 0,
      email: data.email,
      telefone_1: data.ddd_telefone_1,
      telefone_2: data.ddd_telefone_2,
      qsa: data.qsa || []
    };
    
    // If QSA is empty from OpenCNPJ, try to get it from BrasilAPI
    if (!result.qsa || result.qsa.length === 0) {
      console.log(`[OpenCNPJ] QSA empty for ${cnpj}, fetching from BrasilAPI...`);
      const brasilData = await tryBrasilAPI(cnpj);
      if (brasilData && brasilData.qsa && brasilData.qsa.length > 0) {
        result.qsa = brasilData.qsa;
        console.log(`[BrasilAPI] Got ${result.qsa.length} partners for ${cnpj}`);
        
        // Also fill in missing fields from BrasilAPI
        if (!result.email && brasilData.email) result.email = brasilData.email;
        if (!result.telefone_1 && brasilData.telefone_1) result.telefone_1 = brasilData.telefone_1;
        if (!result.telefone_2 && brasilData.telefone_2) result.telefone_2 = brasilData.telefone_2;
      }
    }
    
    return result;
  } catch (error) {
    console.error(`[OpenCNPJ] Error:`, error);
    return await tryBrasilAPI(cnpj);
  }
}

serve(async (req) => {
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
    console.log(`[search-cnpj-by-name] Simplified name: ${simplifyCompanyName(companyName)}`);
    console.log(`[search-cnpj-by-name] Main name: ${extractMainName(companyName)}`);

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

    // Build progressive search queries
    const queries = buildSearchQueries(companyName, city, state);
    console.log(`[search-cnpj-by-name] Will try ${queries.length} search queries`);

    const allCNPJs: Set<string> = new Set();
    
    // Try each query until we find CNPJs
    for (let i = 0; i < queries.length && allCNPJs.size < 5; i++) {
      const query = queries[i];
      console.log(`[Google CSE] Query ${i + 1}/${queries.length}: ${query.substring(0, 100)}...`);
      
      const { items, error } = await searchGoogleCSE(query, GOOGLE_API_KEY, GOOGLE_CSE_ID);
      
      if (error) {
        console.error(`[Google CSE] Query ${i + 1} failed:`, error);
        continue;
      }
      
      console.log(`[Google CSE] Query ${i + 1} returned ${items.length} results`);
      
      for (const item of items) {
        const textToSearch = `${item.title || ''} ${item.snippet || ''} ${item.link || ''}`;
        const cnpjs = extractCNPJsFromText(textToSearch);
        cnpjs.filter(isValidCNPJ).forEach(cnpj => allCNPJs.add(cnpj));
      }
      
      // If we found CNPJs, don't need to try more queries
      if (allCNPJs.size > 0) {
        console.log(`[search-cnpj-by-name] Found ${allCNPJs.size} CNPJs on query ${i + 1}`);
        break;
      }
      
      // Small delay between queries
      if (i < queries.length - 1) {
        await delay(200);
      }
    }
    
    const uniqueCNPJs = Array.from(allCNPJs);
    console.log(`[search-cnpj-by-name] Total unique valid CNPJs: ${uniqueCNPJs.length}: ${uniqueCNPJs.join(', ')}`);

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

    // Validate each CNPJ and find best match
    let bestMatch: any = null;
    let bestSimilarity = 0;

    for (const cnpj of uniqueCNPJs.slice(0, 5)) {
      try {
        console.log(`[Validate] Checking CNPJ: ${cnpj}`);
        
        const cnpjData = await validateWithOpenCNPJ(cnpj);
        
        if (!cnpjData) {
          console.log(`[Validate] CNPJ ${cnpj} not found`);
          await delay(300);
          continue;
        }
        
        // Calculate similarity with both names
        const simRazao = calculateSimilarity(companyName, cnpjData.razao_social || '');
        const simFantasia = calculateSimilarity(companyName, cnpjData.nome_fantasia || '');
        
        // Also compare with simplified name
        const simplifiedName = simplifyCompanyName(companyName);
        const simRazaoSimp = calculateSimilarity(simplifiedName, cnpjData.razao_social || '');
        const simFantasiaSimp = calculateSimilarity(simplifiedName, cnpjData.nome_fantasia || '');
        
        const maxSim = Math.max(simRazao, simFantasia, simRazaoSimp, simFantasiaSimp);

        console.log(`[Validate] ${cnpj}: razao="${cnpjData.razao_social}", fantasia="${cnpjData.nome_fantasia}", similarity=${maxSim.toFixed(2)}`);

        // Location bonus
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
            ...cnpjData,
            similarity: finalSimilarity
          };
        }

        await delay(300);
      } catch (error) {
        console.error(`[Validate] Error for ${cnpj}:`, error);
        await delay(300);
      }
    }

    // Lower threshold to 45% for more results
    if (bestMatch && bestSimilarity >= 0.45) {
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
