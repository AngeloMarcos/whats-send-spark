import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
const SERPER_BASE_URL = 'https://google.serper.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperSearchResponse {
  organic: SerperOrganicResult[];
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, searchType = 'search', gl = 'br', hl = 'pt-br', num = 10 } = await req.json();
    console.log(`[serper-search] Query: "${query}", Type: ${searchType}, Num: ${num}`);

    if (!SERPER_API_KEY) {
      console.error('[serper-search] API key not configured');
      return new Response(
        JSON.stringify({ error: 'Serper API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine endpoint based on search type
    let endpoint = '/search';
    if (searchType === 'images') endpoint = '/images';
    if (searchType === 'news') endpoint = '/news';
    if (searchType === 'places') endpoint = '/places';

    console.log(`[serper-search] Calling ${SERPER_BASE_URL}${endpoint}`);

    const res = await fetch(`${SERPER_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl,
        hl,
        num,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[serper-search] Error ${res.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Serper API error: ${res.status}`, details: errorText }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    console.log(`[serper-search] Success, results: ${data.organic?.length || 0}`);

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[serper-search] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
