import { useState, useCallback } from 'react';

export interface Localidade {
  id: number;
  nome: string;
  tipo: 'estado' | 'municipio';
  uf?: string;
  codigoIBGE?: string;
}

interface IBGEEstado {
  id: number;
  sigla: string;
  nome: string;
}

interface IBGEMunicipio {
  id: number;
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla: string;
      };
    };
  };
}

// Cache para evitar múltiplas chamadas
let estadosCache: IBGEEstado[] | null = null;
let municipiosCache: Map<string, IBGEMunicipio[]> = new Map();

export function useIBGELocalidades() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstados = useCallback(async (): Promise<IBGEEstado[]> => {
    if (estadosCache) return estadosCache;
    
    try {
      const response = await fetch(
        'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'
      );
      
      if (!response.ok) throw new Error('Erro ao buscar estados');
      
      estadosCache = await response.json();
      return estadosCache!;
    } catch (err) {
      console.error('Erro ao buscar estados:', err);
      return [];
    }
  }, []);

  const fetchMunicipiosByUF = useCallback(async (uf: string): Promise<IBGEMunicipio[]> => {
    if (municipiosCache.has(uf)) return municipiosCache.get(uf)!;
    
    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
      );
      
      if (!response.ok) throw new Error('Erro ao buscar municípios');
      
      const data = await response.json();
      municipiosCache.set(uf, data);
      return data;
    } catch (err) {
      console.error('Erro ao buscar municípios:', err);
      return [];
    }
  }, []);

  const searchLocalidades = useCallback(async (query: string): Promise<Localidade[]> => {
    if (!query || query.length < 2) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const results: Localidade[] = [];
      
      // Buscar estados
      const estados = await fetchEstados();
      const estadosMatch = estados.filter(estado => {
        const normalizedNome = estado.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normalizedSigla = estado.sigla.toLowerCase();
        return normalizedNome.includes(normalizedQuery) || normalizedSigla.includes(normalizedQuery);
      });
      
      results.push(...estadosMatch.map(estado => ({
        id: estado.id,
        nome: estado.nome,
        tipo: 'estado' as const,
        uf: estado.sigla,
        codigoIBGE: estado.id.toString(),
      })));
      
      // Para cada estado correspondente, buscar municípios
      for (const estado of estadosMatch.slice(0, 3)) {
        const municipios = await fetchMunicipiosByUF(estado.sigla);
        results.push(...municipios.slice(0, 5).map(mun => ({
          id: mun.id,
          nome: mun.nome,
          tipo: 'municipio' as const,
          uf: estado.sigla,
          codigoIBGE: mun.id.toString(),
        })));
      }
      
      // Buscar municípios em todos os estados (usando API de busca)
      try {
        const municipiosResponse = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome`
        );
        
        if (municipiosResponse.ok) {
          const allMunicipios: IBGEMunicipio[] = await municipiosResponse.json();
          const municipiosMatch = allMunicipios
            .filter(mun => {
              const normalizedNome = mun.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              return normalizedNome.includes(normalizedQuery);
            })
            .slice(0, 15);
          
          for (const mun of municipiosMatch) {
            if (!results.find(r => r.id === mun.id)) {
              results.push({
                id: mun.id,
                nome: mun.nome,
                tipo: 'municipio',
                uf: mun.microrregiao?.mesorregiao?.UF?.sigla,
                codigoIBGE: mun.id.toString(),
              });
            }
          }
        }
      } catch (err) {
        console.error('Erro ao buscar todos os municípios:', err);
      }
      
      // Remover duplicatas e limitar resultados
      const uniqueResults = results.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      
      return uniqueResults.slice(0, 20);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar localidades';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [fetchEstados, fetchMunicipiosByUF]);

  const getEstados = useCallback(async (): Promise<Localidade[]> => {
    const estados = await fetchEstados();
    return estados.map(estado => ({
      id: estado.id,
      nome: estado.nome,
      tipo: 'estado' as const,
      uf: estado.sigla,
      codigoIBGE: estado.id.toString(),
    }));
  }, [fetchEstados]);

  const getMunicipiosByUF = useCallback(async (uf: string): Promise<Localidade[]> => {
    const municipios = await fetchMunicipiosByUF(uf);
    return municipios.map(mun => ({
      id: mun.id,
      nome: mun.nome,
      tipo: 'municipio' as const,
      uf,
      codigoIBGE: mun.id.toString(),
    }));
  }, [fetchMunicipiosByUF]);

  return {
    searchLocalidades,
    getEstados,
    getMunicipiosByUF,
    isLoading,
    error,
  };
}
