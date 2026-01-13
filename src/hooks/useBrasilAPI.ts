import { useState, useCallback } from 'react';

export interface BrasilAPIResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  ddd_telefone_1: string;
  ddd_telefone_2: string;
  email: string;
  descricao_situacao_cadastral: string;
  situacao_cadastral: number;
  data_situacao_cadastral: string;
  data_inicio_atividade: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  cnaes_secundarios: Array<{
    codigo: number;
    descricao: string;
  }>;
  natureza_juridica: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  uf: string;
  municipio: string;
  porte: string;
  capital_social: number;
  tipo: string;
  descricao_tipo_de_logradouro: string;
  qsa: Array<{
    identificador_de_socio: number;
    nome_socio: string;
    cnpj_cpf_do_socio: string;
    qualificacao_socio: string;
    data_entrada_sociedade: string;
    percentual_capital_social: number;
  }>;
}

interface UseBrasilAPIReturn {
  isLoading: boolean;
  error: string | null;
  data: BrasilAPIResponse | null;
  searchCNPJ: (cnpj: string) => Promise<BrasilAPIResponse | null>;
  clearData: () => void;
}

export function useBrasilAPI(): UseBrasilAPIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BrasilAPIResponse | null>(null);

  const searchCNPJ = useCallback(async (cnpj: string): Promise<BrasilAPIResponse | null> => {
    // Remove caracteres não numéricos
    const cleanedCNPJ = cnpj.replace(/\D/g, '');
    
    // Validação básica de CNPJ (14 dígitos)
    if (cleanedCNPJ.length !== 14) {
      setError('CNPJ deve conter 14 dígitos');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanedCNPJ}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('CNPJ não encontrado na base de dados');
        }
        if (response.status === 400) {
          throw new Error('CNPJ inválido');
        }
        throw new Error(`Erro na consulta: ${response.status}`);
      }

      const result: BrasilAPIResponse = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao consultar CNPJ';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    searchCNPJ,
    clearData,
  };
}
