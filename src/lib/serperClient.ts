import { supabase } from '@/integrations/supabase/client';

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SerperSearchResponse {
  organic: SerperOrganicResult[];
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
  };
}

export type SerperSearchType = 'search' | 'images' | 'news' | 'places';

export interface SerperSearchOptions {
  query: string;
  searchType?: SerperSearchType;
  gl?: string; // Country code (default: 'br')
  hl?: string; // Language (default: 'pt-br')
  num?: number; // Number of results (default: 10)
}

/**
 * Search Google using Serper.dev API via edge function
 */
export async function serperSearch(options: SerperSearchOptions): Promise<SerperSearchResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke('serper-search', {
      body: {
        query: options.query,
        searchType: options.searchType || 'search',
        gl: options.gl || 'br',
        hl: options.hl || 'pt-br',
        num: options.num || 10,
      },
    });

    if (error) {
      console.error('Error calling serper-search function:', error);
      return null;
    }

    return data?.data || null;
  } catch (error) {
    console.error('Error searching with Serper:', error);
    return null;
  }
}

/**
 * Search for phone numbers of a person using Serper
 */
export async function searchPhoneByName(
  personName: string,
  city?: string,
  state?: string
): Promise<string[]> {
  try {
    const locationPart = [city, state].filter(Boolean).join(' ');
    const query = `"${personName}" telefone celular ${locationPart}`.trim();
    
    const result = await serperSearch({ query, num: 5 });
    
    if (!result?.organic) return [];

    // Extract phone numbers from snippets
    const phoneRegex = /\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/g;
    const phones: string[] = [];

    for (const item of result.organic) {
      const snippetPhones = item.snippet?.match(phoneRegex) || [];
      phones.push(...snippetPhones);
    }

    // Deduplicate and clean
    const uniquePhones = [...new Set(phones.map(p => p.replace(/\D/g, '')))];
    return uniquePhones.slice(0, 5); // Return max 5 phones
  } catch (error) {
    console.error('Error searching phone by name:', error);
    return [];
  }
}
