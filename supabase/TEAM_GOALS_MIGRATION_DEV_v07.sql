-- EPSA Gestão Comercial v0.7 — SOMENTE projeto Supabase Gestão Comercial Temporário.
-- Migração aplicada previamente no projeto tilrqwcymhghmpvxukur: NÃO reaplicar.
BEGIN;
CREATE TABLE public.gc_team_monthly_goals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL,
 team_id uuid NOT NULL,
 month_start date NOT NULL CHECK (month_start = date_trunc('month',month_start)::date),
 goal_atendimentos integer NOT NULL DEFAULT 0 CHECK (goal_atendimentos BETWEEN 0 AND 10000000),
 goal_vendas integer NOT NULL DEFAULT 0 CHECK (goal_vendas BETWEEN 0 AND 10000000),
 goal_cotas integer NOT NULL DEFAULT 0 CHECK (goal_cotas BETWEEN 0 AND 10000000),
 goal_creditos numeric(16,2) NOT NULL DEFAULT 0 CHECK (goal_creditos BETWEEN 0 AND 10000000000000),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT gc_team_goal_team_fk FOREIGN KEY (company_id,team_id) REFERENCES public.gc_teams(company_id,id),
 CONSTRAINT gc_team_goal_unique UNIQUE (company_id,team_id,month_start)
);
CREATE INDEX gc_team_goal_period_idx ON public.gc_team_monthly_goals (company_id,month_start);
ALTER TABLE public.gc_team_monthly_goals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gc_team_monthly_goals FROM public,anon,authenticated;
GRANT SELECT, INSERT ON public.gc_team_monthly_goals TO authenticated;
GRANT UPDATE (goal_atendimentos,goal_vendas,goal_cotas,goal_creditos) ON public.gc_team_monthly_goals TO authenticated;
CREATE POLICY gc_team_goals_select ON public.gc_team_monthly_goals FOR SELECT TO authenticated USING (
 gc_private.is_member(company_id) AND (
 gc_private.has_role(company_id,'manager')
 OR gc_private.is_assigned(company_id,team_id,(SELECT auth.uid()))
 OR EXISTS(SELECT 1 FROM public.gc_teams t WHERE t.id=team_id AND t.company_id=gc_team_monthly_goals.company_id AND t.supervisor_user_id=(SELECT auth.uid()))
 ));
CREATE POLICY gc_team_goals_insert ON public.gc_team_monthly_goals FOR INSERT TO authenticated WITH CHECK (
 gc_private.has_role(company_id,'manager')
 OR EXISTS(SELECT 1 FROM public.gc_teams t WHERE t.id=team_id AND t.company_id=gc_team_monthly_goals.company_id AND t.supervisor_user_id=(SELECT auth.uid()))
 );
CREATE POLICY gc_team_goals_update ON public.gc_team_monthly_goals FOR UPDATE TO authenticated USING (
 gc_private.has_role(company_id,'manager')
 OR EXISTS(SELECT 1 FROM public.gc_teams t WHERE t.id=team_id AND t.company_id=gc_team_monthly_goals.company_id AND t.supervisor_user_id=(SELECT auth.uid()))
 ) WITH CHECK (
 gc_private.has_role(company_id,'manager')
 OR EXISTS(SELECT 1 FROM public.gc_teams t WHERE t.id=team_id AND t.company_id=gc_team_monthly_goals.company_id AND t.supervisor_user_id=(SELECT auth.uid()))
 );
CREATE FUNCTION gc_private.gc_guard_team_goal_insert() RETURNS trigger
 LANGUAGE plpgsql SET search_path = '' AS $$
 BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (
   gc_private.has_role(NEW.company_id,'manager')
   OR EXISTS(SELECT 1 FROM public.gc_teams t WHERE t.id=NEW.team_id AND t.company_id=NEW.company_id AND t.supervisor_user_id=(SELECT auth.uid()))
  ) THEN RAISE EXCEPTION 'Cadastro de meta de equipe não autorizado'; END IF;
  NEW.created_by=(SELECT auth.uid()); NEW.updated_by=(SELECT auth.uid());
  NEW.created_at=now(); NEW.updated_at=now();
  RETURN NEW;
 END; $$;
CREATE FUNCTION gc_private.gc_guard_team_goal_update() RETURNS trigger
 LANGUAGE plpgsql SET search_path = '' AS $$
 BEGIN
  IF NOT (
   gc_private.has_role(OLD.company_id,'manager')
   OR EXISTS(SELECT 1 FROM public.gc_teams t WHERE t.id=OLD.team_id AND t.company_id=OLD.company_id AND t.supervisor_user_id=(SELECT auth.uid()))
  ) OR (
   to_jsonb(NEW)-'goal_atendimentos'-'goal_vendas'-'goal_cotas'-'goal_creditos'-'updated_at'-'updated_by'
  ) <> (
   to_jsonb(OLD)-'goal_atendimentos'-'goal_vendas'-'goal_cotas'-'goal_creditos'-'updated_at'-'updated_by'
  ) THEN RAISE EXCEPTION 'Alteração de meta de equipe não autorizada'; END IF;
  NEW.updated_by=(SELECT auth.uid());NEW.updated_at=now();RETURN NEW;
 END; $$;
CREATE TRIGGER gc_team_goal_insert_guard BEFORE INSERT ON public.gc_team_monthly_goals
 FOR EACH ROW EXECUTE FUNCTION gc_private.gc_guard_team_goal_insert();
CREATE TRIGGER gc_team_goal_update_guard BEFORE UPDATE ON public.gc_team_monthly_goals
 FOR EACH ROW EXECUTE FUNCTION gc_private.gc_guard_team_goal_update();
REVOKE ALL ON FUNCTION gc_private.gc_guard_team_goal_insert() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION gc_private.gc_guard_team_goal_update() FROM PUBLIC,anon,authenticated;
CREATE TABLE public.gc_team_goal_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 goal_id uuid NOT NULL,company_id uuid NOT NULL,
 event text NOT NULL,changed_by uuid,old_row jsonb,new_row jsonb,
 changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gc_team_goal_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gc_team_goal_audit FROM PUBLIC,anon,authenticated;
CREATE FUNCTION gc_private.gc_audit_team_goal() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 BEGIN
  INSERT INTO public.gc_team_goal_audit(goal_id,company_id,event,changed_by,old_row,new_row)
   VALUES(NEW.id,NEW.company_id,lower(TG_OP),(SELECT auth.uid()),
    CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
  RETURN NEW;
 END; $$;
CREATE TRIGGER gc_team_goal_audit AFTER INSERT OR UPDATE ON public.gc_team_monthly_goals
 FOR EACH ROW EXECUTE FUNCTION gc_private.gc_audit_team_goal();
REVOKE ALL ON FUNCTION gc_private.gc_audit_team_goal() FROM PUBLIC,anon,authenticated;
COMMIT;
