import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface ReceitaWSResponse {
  cnpj: string;
  nome: string;
  fantasia: string;
  telefone: string;
  email: string;
  qsa: Array<{ nome: string; qual: string }>;
  situacao: string;
  atividade_principal: Array<{ code: string; text: string }>;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  status: string;
  message?: string;
}

export interface LeadFromCNPJ {
  cnpj: string;
  telefones: string;
  email: string;
  razao_social: string;
  owner_name: string;
  situacao: string;
  atividade: string;
  endereco: string;
}

const CACHE_KEY = 'receitaws_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_MS = 5000; // 5 seconds between requests for same CNPJ

interface CacheEntry {
  data: ReceitaWSResponse;
  timestamp: number;
}

interface RateLimitEntry {
  timestamp: number;
}

// Validate CNPJ using verification digits algorithm
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // First verification digit
  let sum = 0;
  const weight1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weight1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  // Second verification digit
  sum = 0;
  const weight2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weight2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return cleaned[12] === String(digit1) && cleaned[13] === String(digit2);
}

export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cleanCNPJ(cnpj);
  if (cleaned.length !== 14) return cnpj;
  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

function getFromCache(cnpj: string): ReceitaWSResponse | null {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entry: CacheEntry | undefined = cache[cnpj];
    
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function saveToCache(cnpj: string, data: ReceitaWSResponse): void {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[cnpj] = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache errors
  }
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Falha após múltiplas tentativas');
}

export function useReceitaWS() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadData, setLeadData] = useState<LeadFromCNPJ | null>(null);
  const [rawResponse, setRawResponse] = useState<ReceitaWSResponse | null>(null);
  const rateLimitRef = useRef<Record<string, RateLimitEntry>>({});

  const searchCNPJ = useCallback(async (cnpj: string): Promise<LeadFromCNPJ | null> => {
    const cleaned = cleanCNPJ(cnpj);
    
    // Validate CNPJ
    if (!validateCNPJ(cleaned)) {
      setError('CNPJ inválido');
      setLeadData(null);
      return null;
    }

    // Check rate limit
    const lastRequest = rateLimitRef.current[cleaned];
    if (lastRequest && Date.now() - lastRequest.timestamp < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastRequest.timestamp)) / 1000);
      toast.info(`Aguarde ${waitTime}s para buscar este CNPJ novamente`);
      return leadData;
    }

    // Check cache first
    const cached = getFromCache(cleaned);
    if (cached) {
      const lead = transformResponse(cached);
      setLeadData(lead);
      setRawResponse(cached);
      setError(null);
      toast.success('Dados recuperados do cache');
      return lead;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update rate limit
      rateLimitRef.current[cleaned] = { timestamp: Date.now() };

      const response = await fetchWithRetry(
        `https://www.receitaws.com.br/v1/cnpj/${cleaned}`
      );

      if (!response.ok) {
        throw new Error('Erro na conexão');
      }

      const data: ReceitaWSResponse = await response.json();

      if (data.status === 'ERROR') {
        setError('CNPJ não encontrado na Receita Federal');
        setLeadData(null);
        setRawResponse(null);
        return null;
      }

      // Save to cache
      saveToCache(cleaned, data);

      const lead = transformResponse(data);
      setLeadData(lead);
      setRawResponse(data);
      toast.success('Dados obtidos com sucesso!');
      return lead;

    } catch (err) {
      console.error('ReceitaWS error:', err);
      setError('Erro ao buscar dados. Tente novamente.');
      setLeadData(null);
      setRawResponse(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [leadData]);

  const clearData = useCallback(() => {
    setLeadData(null);
    setRawResponse(null);
    setError(null);
  }, []);

  const updateLeadField = useCallback((field: keyof LeadFromCNPJ, value: string) => {
    if (leadData) {
      setLeadData({ ...leadData, [field]: value });
    }
  }, [leadData]);

  return {
    isLoading,
    error,
    leadData,
    rawResponse,
    searchCNPJ,
    clearData,
    updateLeadField,
    validateCNPJ,
    formatCNPJ,
    cleanCNPJ,
  };
}

function transformResponse(data: ReceitaWSResponse): LeadFromCNPJ {
  const endereco = [
    data.logradouro,
    data.numero,
    data.bairro,
    data.municipio,
    data.uf,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    cnpj: data.cnpj,
    telefones: data.telefone || '',
    email: data.email || '',
    razao_social: data.nome || '',
    owner_name: data.qsa?.[0]?.nome || '',
    situacao: data.situacao || '',
    atividade: data.atividade_principal?.[0]?.text || '',
    endereco,
  };
}
