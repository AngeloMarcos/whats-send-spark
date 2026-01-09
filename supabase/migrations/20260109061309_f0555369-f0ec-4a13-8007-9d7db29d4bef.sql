-- Create table for saved searches
CREATE TABLE IF NOT EXISTS public.pesquisas_salvas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  filtros JSONB NOT NULL DEFAULT '{}',
  total_resultados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pesquisas_salvas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saved searches"
  ON public.pesquisas_salvas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches"
  ON public.pesquisas_salvas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches"
  ON public.pesquisas_salvas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
  ON public.pesquisas_salvas FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_pesquisas_salvas_user_id ON public.pesquisas_salvas(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_pesquisas_salvas_updated_at
  BEFORE UPDATE ON public.pesquisas_salvas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();