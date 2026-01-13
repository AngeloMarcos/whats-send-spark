import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface PlaceDetails {
  name: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
  types?: string[];
  url?: string;
}

interface ExtractedLead {
  name: string;
  phone: string;
  address: string;
  category: string;
  rating: number | null;
  reviews_count: number | null;
  website: string | null;
  opening_hours: string[] | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string;
  maps_url: string;
}

interface GeocodeResult {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_address: string;
}

function isValidBrazilianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10 || cleaned.length > 13) return false;
  return true;
}

function formatPhoneToInternational(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('55') && cleaned.length >= 10 && cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}

function translatePlaceType(type: string): string {
  const translations: Record<string, string> = {
    restaurant: 'Restaurante',
    food: 'Alimentação',
    store: 'Loja',
    health: 'Saúde',
    doctor: 'Médico',
    dentist: 'Dentista',
    hospital: 'Hospital',
    pharmacy: 'Farmácia',
    gym: 'Academia',
    beauty_salon: 'Salão de Beleza',
    hair_care: 'Cabeleireiro',
    spa: 'Spa',
    bar: 'Bar',
    cafe: 'Café',
    bakery: 'Padaria',
    clothing_store: 'Loja de Roupas',
    shoe_store: 'Loja de Sapatos',
    jewelry_store: 'Joalheria',
    car_dealer: 'Concessionária',
    car_repair: 'Mecânica',
    car_wash: 'Lava-rápido',
    gas_station: 'Posto de Combustível',
    lodging: 'Hospedagem',
    hotel: 'Hotel',
    real_estate_agency: 'Imobiliária',
    lawyer: 'Advogado',
    accounting: 'Contabilidade',
    insurance_agency: 'Seguradora',
    bank: 'Banco',
    atm: 'Caixa Eletrônico',
    school: 'Escola',
    university: 'Universidade',
    pet_store: 'Pet Shop',
    veterinary_care: 'Veterinário',
    supermarket: 'Supermercado',
    grocery_or_supermarket: 'Mercado',
    convenience_store: 'Conveniência',
    electronics_store: 'Eletrônicos',
    furniture_store: 'Móveis',
    home_goods_store: 'Utilidades Domésticas',
    hardware_store: 'Ferragens',
    florist: 'Floricultura',
    book_store: 'Livraria',
    movie_theater: 'Cinema',
    night_club: 'Balada',
    park: 'Parque',
    amusement_park: 'Parque de Diversões',
    zoo: 'Zoológico',
    aquarium: 'Aquário',
    museum: 'Museu',
    art_gallery: 'Galeria de Arte',
    church: 'Igreja',
    mosque: 'Mesquita',
    synagogue: 'Sinagoga',
    hindu_temple: 'Templo Hindu',
    cemetery: 'Cemitério',
    city_hall: 'Prefeitura',
    courthouse: 'Fórum',
    fire_station: 'Bombeiros',
    police: 'Polícia',
    post_office: 'Correios',
    library: 'Biblioteca',
    local_government_office: 'Órgão Público',
    establishment: 'Estabelecimento',
    point_of_interest: 'Ponto de Interesse',
  };
  return translations[type] || type.replace(/_/g, ' ');
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - verify user is logged in
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração do servidor inválida' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { query, location, radius = 5000, maxResults = 50, minRating = 0, onlyWithPhone = true } = await req.json();

    if (!query || !location) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query e localização são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API Key do Google Places não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} searching: "${query}" in "${location}" with radius ${radius}m`);

    // Step 1: Geocode the location to get coordinates
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&language=pt-BR&key=${apiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== 'OK' || !geocodeData.results?.[0]) {
      console.error('Geocode API error:', geocodeData);
      return new Response(
        JSON.stringify({ success: false, error: `Localização não encontrada: ${location}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geocodeResult: GeocodeResult = geocodeData.results[0];
    const { lat, lng } = geocodeResult.geometry.location;
    const formattedLocation = geocodeResult.formatted_address;

    console.log(`Geocoded to: ${lat}, ${lng} (${formattedLocation})`);

    // Step 2: Text Search with location bias using coordinates
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=${radius}&language=pt-BR&key=${apiKey}`;
    
    let allPlaceIds: string[] = [];
    let nextPageToken: string | null = null;
    let pageCount = 0;
    const maxPages = Math.ceil(maxResults / 20);
    let totalSearched = 0;

    do {
      const searchUrl: string = nextPageToken 
        ? `${textSearchUrl}&pagetoken=${nextPageToken}`
        : textSearchUrl;

      // Wait 2 seconds between page token requests (Google API requirement)
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const searchResponse: Response = await fetch(searchUrl);
      const searchData: { status: string; results?: PlaceResult[]; next_page_token?: string } = await searchResponse.json();

      if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
        console.error('Text Search API error:', searchData);
        return new Response(
          JSON.stringify({ success: false, error: `Erro na busca: ${searchData.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (searchData.results) {
        const placeIds = searchData.results.map((r: PlaceResult) => r.place_id);
        allPlaceIds = [...allPlaceIds, ...placeIds];
        totalSearched += searchData.results.length;
      }

      nextPageToken = searchData.next_page_token || null;
      pageCount++;

    } while (nextPageToken && pageCount < maxPages && allPlaceIds.length < maxResults);

    console.log(`Found ${allPlaceIds.length} places, fetching details...`);

    // Step 3: Get details for each place
    const leads: ExtractedLead[] = [];
    const detailsFields = 'name,formatted_phone_number,international_phone_number,formatted_address,geometry,rating,user_ratings_total,website,opening_hours,types,url';
    let withPhoneCount = 0;

    for (const placeId of allPlaceIds.slice(0, maxResults)) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${detailsFields}&language=pt-BR&key=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsData.status !== 'OK' || !detailsData.result) {
          console.log(`Skipping ${placeId}: ${detailsData.status}`);
          continue;
        }

        const place: PlaceDetails = detailsData.result;
        const phone = place.international_phone_number || place.formatted_phone_number || '';
        
        // Count places with phone
        if (phone) {
          withPhoneCount++;
        }

        // Filter by phone if required
        if (onlyWithPhone && !phone) {
          continue;
        }

        // Filter by rating
        if (minRating > 0 && (place.rating || 0) < minRating) {
          continue;
        }

        // Validate Brazilian phone
        if (phone && !isValidBrazilianPhone(phone)) {
          continue;
        }

        const formattedPhone = phone ? formatPhoneToInternational(phone) : '';
        const category = place.types && place.types.length > 0 
          ? translatePlaceType(place.types[0]) 
          : 'Estabelecimento';

        const mapsUrl = place.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`;

        leads.push({
          name: place.name,
          phone: formattedPhone,
          address: place.formatted_address || '',
          category,
          rating: place.rating || null,
          reviews_count: place.user_ratings_total || null,
          website: place.website || null,
          opening_hours: place.opening_hours?.weekday_text || null,
          latitude: place.geometry?.location?.lat || null,
          longitude: place.geometry?.location?.lng || null,
          place_id: placeId,
          maps_url: mapsUrl,
        });

      } catch (err) {
        console.error(`Error fetching details for ${placeId}:`, err);
      }
    }

    const processingTime = (Date.now() - startTime) / 1000;
    console.log(`User ${user.id} extracted ${leads.length} leads in ${processingTime}s`);

    return new Response(
      JSON.stringify({
        success: true,
        data: leads,
        metrics: {
          total: leads.length,
          searched: totalSearched,
          with_phone: withPhoneCount,
          success_rate: totalSearched > 0 ? Math.round((leads.length / totalSearched) * 100) : 0,
          processing_time: processingTime,
        },
        query,
        location: formattedLocation,
        coordinates: { lat, lng },
        radius,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-google-places:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar estabelecimentos';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});