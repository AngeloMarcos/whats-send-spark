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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location, maxResults = 50, minRating = 0, onlyWithPhone = true } = await req.json();

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

    console.log(`Searching: "${query}" in "${location}"`);

    // Step 1: Text Search to get place_ids
    const searchQuery = `${query} em ${location}`;
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&language=pt-BR&key=${apiKey}`;
    
    let allPlaceIds: string[] = [];
    let nextPageToken: string | null = null;
    let pageCount = 0;
    const maxPages = Math.ceil(maxResults / 20);

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
      }

      nextPageToken = searchData.next_page_token || null;
      pageCount++;

    } while (nextPageToken && pageCount < maxPages && allPlaceIds.length < maxResults);

    console.log(`Found ${allPlaceIds.length} places, fetching details...`);

    // Step 2: Get details for each place
    const leads: ExtractedLead[] = [];
    const detailsFields = 'name,formatted_phone_number,international_phone_number,formatted_address,geometry,rating,user_ratings_total,website,opening_hours,types';

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
        });

      } catch (err) {
        console.error(`Error fetching details for ${placeId}:`, err);
      }
    }

    console.log(`Extracted ${leads.length} leads with valid phone numbers`);

    return new Response(
      JSON.stringify({
        success: true,
        data: leads,
        total: leads.length,
        query,
        location,
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
