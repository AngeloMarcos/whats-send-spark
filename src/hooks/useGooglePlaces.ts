import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Socio {
  nome: string;
  qualificacao: string;
  dataEntrada?: string;
  tipo: 'PF' | 'PJ';
  telefonesEncontrados?: string[];
  fontesTelefones?: string[];
}

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
  maps_url?: string;
  
  // CNPJ enrichment fields
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  email_oficial?: string;
  telefones_oficiais?: string[];
  situacao_cadastral?: string;
  porte?: string;
  capital_social?: number;
  socios?: Socio[];
  enriched?: boolean;
  enrichmentError?: string;
  cnpjFoundByName?: boolean;
}

export interface SearchMetrics {
  total: number;
  searched: number;
  with_phone: number;
  success_rate: number;
  processing_time: number;
}

export interface SearchParams {
  query: string;
  location: string;
  radius?: number;
  maxResults?: number;
  minRating?: number;
  onlyWithPhone?: boolean;
}

export function useGooglePlaces() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SearchMetrics | null>(null);
  const [searchLocation, setSearchLocation] = useState<string | null>(null);
  const { toast } = useToast();

  const searchPlaces = async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setMetrics(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-google-places', {
        body: {
          query: params.query,
          location: params.location,
          radius: params.radius || 5000,
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
      setMetrics(data.metrics);
      setSearchLocation(data.location);
      
      toast({
        title: 'Busca concluída',
        description: `${data.data.length} estabelecimentos encontrados em ${data.metrics.processing_time.toFixed(1)}s`,
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
    setMetrics(null);
    setSearchLocation(null);
  };

  return {
    leads,
    isLoading,
    error,
    metrics,
    searchLocation,
    searchPlaces,
    clearResults,
  };
}
