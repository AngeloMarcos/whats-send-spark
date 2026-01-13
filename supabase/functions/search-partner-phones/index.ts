import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  partnerName: string;
  city: string;
  state?: string;
}

interface PhoneResult {
  phone: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
}

// Format Brazilian phone number
function formatPhoneBR(numero: string): string {
  const cleaned = numero.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  
  return numero;
}

// Extract phone numbers from text using regex
function extractPhones(text: string): string[] {
  // Regex for Brazilian phone numbers
  const phoneRegex = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-.\s]?\d{4}/g;
  const matches = text.match(phoneRegex) || [];
  
  const phones: string[] = [];
  
  for (const match of matches) {
    const cleaned = match.replace(/\D/g, '');
    
    // Validate Brazilian phone (10 or 11 digits)
    if (cleaned.length >= 10 && cleaned.length <= 11) {
      // Remove country code if present
      const phoneNumber = cleaned.length > 11 ? cleaned.slice(-11) : cleaned;
      const formatted = formatPhoneBR(phoneNumber);
      
      if (!phones.includes(formatted)) {
        phones.push(formatted);
      }
    }
  }
  
  return phones;
}

// Determine confidence level based on context
function getConfidence(snippet: string, partnerName: string): 'high' | 'medium' | 'low' {
  const lowerSnippet = snippet.toLowerCase();
  const lowerName = partnerName.toLowerCase();
  
  // High confidence: name appears near phone indicators
  if (lowerSnippet.includes(lowerName) && 
      (lowerSnippet.includes('whatsapp') || 
       lowerSnippet.includes('contato') || 
       lowerSnippet.includes('telefone'))) {
    return 'high';
  }
  
  // Medium confidence: name appears in snippet
  if (lowerSnippet.includes(lowerName)) {
    return 'medium';
  }
  
  // Low confidence: phone found but name not in immediate context
  return 'low';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID');

    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      console.error('Missing API keys: GOOGLE_PLACES_API_KEY or GOOGLE_CSE_ID');
      return new Response(
        JSON.stringify({ 
          error: 'API de busca não configurada',
          phones: [],
          sources: []
        }),
        { 
          status: 200, // Return 200 but with empty results
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { partnerName, city, state } = await req.json() as SearchRequest;

    if (!partnerName || !city) {
      return new Response(
        JSON.stringify({ error: 'Nome do sócio e cidade são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching phones for: ${partnerName} in ${city}${state ? ', ' + state : ''}`);

    // Build search query
    const query = `"${partnerName}" ${city}${state ? ' ' + state : ''} (telefone OR celular OR whatsapp OR contato)`;
    
    // Call Google Custom Search API
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.set('key', GOOGLE_API_KEY);
    searchUrl.searchParams.set('cx', GOOGLE_CSE_ID);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('num', '5'); // Limit to 5 results
    searchUrl.searchParams.set('gl', 'br'); // Brazil results
    searchUrl.searchParams.set('lr', 'lang_pt'); // Portuguese language

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', errorText);
      return new Response(
        JSON.stringify({ 
          phones: [], 
          sources: [],
          error: 'Erro na busca Google'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    const items = data.items || [];

    console.log(`Found ${items.length} search results`);

    const results: PhoneResult[] = [];
    const seenPhones = new Set<string>();

    for (const item of items) {
      const text = `${item.title || ''} ${item.snippet || ''} ${item.htmlSnippet || ''}`;
      const phones = extractPhones(text);
      
      for (const phone of phones) {
        const cleanedPhone = phone.replace(/\D/g, '');
        
        if (!seenPhones.has(cleanedPhone)) {
          seenPhones.add(cleanedPhone);
          
          results.push({
            phone,
            source: item.link || item.displayLink || 'Busca Google',
            confidence: getConfidence(text, partnerName)
          });
        }
      }
    }

    // Sort by confidence
    results.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.confidence] - order[b.confidence];
    });

    console.log(`Found ${results.length} unique phones for ${partnerName}`);

    return new Response(
      JSON.stringify({
        phones: results.map(r => r.phone),
        sources: results.map(r => r.source),
        confidences: results.map(r => r.confidence),
        total: results.length
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in search-partner-phones:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        phones: [],
        sources: []
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
