import type { ProcessedPhone } from '@/lib/phoneUtils';

export interface LeadCapturado {
  id: string;
  cnpj: string;
  situacao: string;
  razao_social: string;
  nome_fantasia?: string;
  email?: string;
  data_abertura?: string;
  capital_social?: string;
  porte_empresa?: string;
  tipo?: string;
  regime_tributario?: string;
  
  // Endereço estruturado
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  endereco?: string; // Endereço completo formatado
  
  // Telefones estruturados
  telefones_raw: string; // String original
  telefones: ProcessedPhone[];
  
  // Sócios e atividades
  socios?: Socio[];
  owner_name?: string;
  atividade_principal?: string;
  atividades_secundarias?: string[];
  
  // Metadados
  source: 'receitaws' | 'brasilapi' | 'google_maps' | 'manual';
  lista_captura_id?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  status?: string;
}

export interface Socio {
  nome: string;
  qual?: string;
}

export interface ListaCaptura {
  id: string;
  user_id: string;
  nome: string;
  descricao?: string;
  total_leads: number;
  total_telefones: number;
  created_at: string;
  updated_at: string;
}

export interface BulkSearchProgress {
  current: number;
  total: number;
  found: number;
  errors: number;
  currentCnpj?: string;
}

export interface ExportOptions {
  format: 'csv' | 'excel';
  fields: string[];
  separator?: string;
  includeHeader?: boolean;
  onlyCelulares?: boolean;
  massFormat?: boolean; // telefone | nome | whatsapp_link
}

export const EXPORT_FIELDS = [
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'razao_social', label: 'Razão Social' },
  { key: 'nome_fantasia', label: 'Nome Fantasia' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'tipo_telefone', label: 'Tipo Telefone' },
  { key: 'whatsapp_link', label: 'Link WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'municipio', label: 'Cidade' },
  { key: 'uf', label: 'Estado' },
  { key: 'porte_empresa', label: 'Porte' },
  { key: 'situacao', label: 'Situação' },
  { key: 'data_abertura', label: 'Data Abertura' },
  { key: 'atividade_principal', label: 'Atividade Principal' },
  { key: 'owner_name', label: 'Sócio Principal' },
] as const;
