-- Expandir campos da tabela leads para captura completa
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
ADD COLUMN IF NOT EXISTS capital_social TEXT,
ADD COLUMN IF NOT EXISTS porte_empresa TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS logradouro TEXT,
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS complemento TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS municipio TEXT,
ADD COLUMN IF NOT EXISTS uf TEXT,
ADD COLUMN IF NOT EXISTS data_abertura TEXT,
ADD COLUMN IF NOT EXISTS tipo TEXT,
ADD COLUMN IF NOT EXISTS regime_tributario TEXT,
ADD COLUMN IF NOT EXISTS socios JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS atividades_secundarias JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS telefones_array JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS whatsapp_links JSONB DEFAULT '[]';

-- Criar tabela de listas de captura
CREATE TABLE IF NOT EXISTS public.listas_captura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  total_leads INTEGER DEFAULT 0,
  total_telefones INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.listas_captura ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para listas_captura
CREATE POLICY "Users can view their own capture lists"
  ON public.listas_captura FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own capture lists"
  ON public.listas_captura FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own capture lists"
  ON public.listas_captura FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own capture lists"
  ON public.listas_captura FOR DELETE
  USING (auth.uid() = user_id);

-- Adicionar relacionamento na tabela leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS lista_captura_id UUID REFERENCES public.listas_captura(id) ON DELETE SET NULL;

-- Índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_leads_municipio ON public.leads(municipio);
CREATE INDEX IF NOT EXISTS idx_leads_uf ON public.leads(uf);
CREATE INDEX IF NOT EXISTS idx_leads_porte ON public.leads(porte_empresa);
CREATE INDEX IF NOT EXISTS idx_leads_lista_captura ON public.leads(lista_captura_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_listas_captura_updated_at
  BEFORE UPDATE ON public.listas_captura
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();