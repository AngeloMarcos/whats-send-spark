-- Tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices para consultas rápidas
CREATE INDEX idx_audit_logs_user ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs (created_at DESC);

-- Índice adicional para campanhas (ordenação por data)
CREATE INDEX IF NOT EXISTS idx_campaigns_user_created ON public.campaigns (user_id, created_at DESC);

-- RLS para audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Usuários veem seus próprios logs, admins veem todos
CREATE POLICY "Users view own logs or admins view all" ON public.audit_logs
  FOR SELECT USING (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
  );

-- Sistema pode inserir logs (qualquer usuário autenticado pode criar log)
CREATE POLICY "Authenticated users can insert logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);