-- Criar tabela leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  list_id UUID REFERENCES public.lists(id) ON DELETE CASCADE,
  telefones TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  nome TEXT,
  extra_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_list_id ON public.leads(list_id);
CREATE INDEX IF NOT EXISTS idx_leads_telefones ON public.leads(telefones);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own leads" ON public.leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads" ON public.leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads" ON public.leads
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar contact_count na lista
CREATE OR REPLACE FUNCTION public.update_list_lead_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.lists 
    SET contact_count = contact_count + 1,
        updated_at = now()
    WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.lists 
    SET contact_count = GREATEST(contact_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_list_lead_count_trigger
  AFTER INSERT OR DELETE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_list_lead_count();