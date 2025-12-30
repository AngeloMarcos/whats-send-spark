import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Lead {
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

export interface SearchParams {
  query: string;
  location: string;
  maxResults?: number;
  minRating?: number;
  onlyWithPhone?: boolean;
}

export function useGooglePlaces() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const searchPlaces = async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-google-places', {
        body: {
          query: params.query,
          location: params.location,
          maxResults: params.maxResults || 50,
          minRating: params.minRating || 0,
          onlyWithPhone: params.onlyWithPhone !== false,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro na busca');
      }

      setLeads(data.data);
      toast({
        title: 'Busca concluída',
        description: `${data.data.length} estabelecimentos encontrados`,
      });

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar estabelecimentos';
      setError(message);
      toast({
        title: 'Erro na busca',
        description: message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setLeads([]);
    setError(null);
  };

  return {
    leads,
    isLoading,
    error,
    searchPlaces,
    clearResults,
  };
}
