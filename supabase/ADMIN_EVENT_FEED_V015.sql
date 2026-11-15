-- EPSA Gestão Comercial v0.15 — leitura segura da auditoria administrativa
-- Somente no projeto Supabase Gestão Comercial Temporário.
-- Não altera registros comerciais nem permite modificar eventos de auditoria.
CREATE OR REPLACE FUNCTION gc_private.gc_admin_event_feed_impl(
  p_company_id uuid,
  p_limit integer DEFAULT 30
)
RETURNS TABLE(
  event_id bigint,
  happened_at timestamptz,
  action text,
  actor_name text,
  target_name text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $body$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.gc_memberships AS m
    WHERE m.company_id = p_company_id
      AND m.user_id = auth.uid()
      AND m.role = 'manager'
      AND m.active = true
  ) THEN
    RAISE EXCEPTION 'Somente a diretoria ativa da empresa pode consultar esta auditoria'
      USING ERRCODE = '42501';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'Limite inválido (1 a 50)' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.occurred_at,
    a.operation,
    COALESCE(actor.display_name, 'Diretoria autorizada')::text,
    CASE
      WHEN a.subject_user_id IS NOT NULL
        THEN COALESCE(target.display_name, 'Colaborador')::text
      WHEN a.subject_team_id IS NOT NULL
        THEN COALESCE(t.name, 'Stand')::text
      ELSE COALESCE(c.name, 'Empresa')::text
    END
  FROM gc_private.gc_admin_audit AS a
  INNER JOIN public.gc_companies AS c
    ON c.id = a.company_id
  LEFT JOIN public.gc_memberships AS actor
    ON actor.company_id = a.company_id
   AND actor.user_id = a.actor_user_id
  LEFT JOIN public.gc_memberships AS target
    ON target.company_id = a.company_id
   AND target.user_id = a.subject_user_id
  LEFT JOIN public.gc_teams AS t
    ON t.company_id = a.company_id
   AND t.id = a.subject_team_id
  WHERE a.company_id = p_company_id
  ORDER BY a.occurred_at DESC, a.id DESC
  LIMIT p_limit;
END
$body$;

CREATE OR REPLACE FUNCTION public.gc_admin_event_feed(
  p_company_id uuid,
  p_limit integer DEFAULT 30
)
RETURNS TABLE(
  event_id bigint,
  happened_at timestamptz,
  action text,
  actor_name text,
  target_name text
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $body$
 SELECT event_id, happened_at, action, actor_name, target_name
 FROM gc_private.gc_admin_event_feed_impl(p_company_id, p_limit);
$body$;

REVOKE ALL ON FUNCTION
  gc_private.gc_admin_event_feed_impl(uuid,integer),
  public.gc_admin_event_feed(uuid,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  gc_private.gc_admin_event_feed_impl(uuid,integer),
  public.gc_admin_event_feed(uuid,integer)
TO authenticated;
COMMENT ON FUNCTION public.gc_admin_event_feed(uuid,integer)
IS 'Histórico administrativo somente leitura para Diretoria ativa da própria empresa, com resposta limitada e sem detalhes de payload JSON.';
