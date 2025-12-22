-- Modificar tabela lists para suportar listas locais
ALTER TABLE public.lists 
  ADD COLUMN IF NOT EXISTS list_type text DEFAULT 'google_sheets';

ALTER TABLE public.lists 
  ALTER COLUMN sheet_id DROP NOT NULL;

ALTER TABLE public.lists 
  ADD CONSTRAINT check_list_type 
  CHECK (list_type IN ('google_sheets', 'local'));

-- Criar tabela contacts
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  name text,
  phone text NOT NULL,
  email text,
  extra_data jsonb DEFAULT '{}',
  is_valid boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_contacts_list_id ON public.contacts(list_id);
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);

-- Habilitar RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Policies para contacts
CREATE POLICY "Users can view their own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar contact_count na lista
CREATE OR REPLACE FUNCTION public.update_list_contact_count()
RETURNS TRIGGER 
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

CREATE TRIGGER trigger_update_contact_count
AFTER INSERT OR DELETE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_list_contact_count();

-- Trigger para updated_at em contacts
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();