-- EPSA Gestão Comercial v0.14 — auditoria privada de convites de acesso.
-- EXCLUSIVAMENTE no Supabase Gestão Comercial Temporário.
-- Não cria usuários nem envia e-mails.
CREATE TABLE public.gc_invite_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.gc_companies(id),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  target_email text NOT NULL,
  target_name text NOT NULL,
  target_role text NOT NULL CHECK (target_role IN ('seller','supervisor')),
  status text NOT NULL CHECK (status IN ('processing','sent','failed','link_pending')),
  linked_user_id uuid REFERENCES auth.users(id),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gc_invite_history_normalized_email CHECK (target_email=lower(btrim(target_email)) AND char_length(target_email) BETWEEN 5 AND 254),
  CONSTRAINT gc_invite_history_name_length CHECK (char_length(target_name) BETWEEN 2 AND 120)
);
ALTER TABLE public.gc_invite_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gc_invite_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.gc_invite_history TO service_role;
CREATE UNIQUE INDEX gc_invite_one_active_email_per_company
  ON public.gc_invite_history(company_id,target_email)
  WHERE status IN ('processing','sent','link_pending');
CREATE INDEX gc_invite_actor_recent_idx ON public.gc_invite_history(actor_user_id,created_at DESC);
CREATE INDEX gc_invite_company_recent_idx ON public.gc_invite_history(company_id,created_at DESC);
COMMENT ON TABLE public.gc_invite_history IS
  'Private invitation-delivery audit, only accessible to the Supabase service role; RLS has no client policies. Do not store passwords or invitation links.';
