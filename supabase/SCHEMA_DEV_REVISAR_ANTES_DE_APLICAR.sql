-- EPSA GESTÃO COMERCIAL — esquema DEV, projeto tilrqwcymhghmpvxukur
-- NÃO aplicar no Supabase do EPSA Core Platform ou da GVS Imóveis.
-- Migração inicial v0.5; executar SOMENTE uma vez em projeto de homologação vazio.
-- Requer PostgreSQL com auth.uid() fornecido pelo Supabase.
BEGIN;

CREATE SCHEMA gc_private;
REVOKE ALL ON SCHEMA gc_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA gc_private TO authenticated;

CREATE TABLE public.gc_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 180),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.gc_memberships (
  company_id uuid NOT NULL REFERENCES public.gc_companies(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('seller','supervisor','manager')),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 2 AND 120),
  active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(company_id,user_id)
);
CREATE TABLE public.gc_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.gc_companies(id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  unit_name text NOT NULL DEFAULT '' CHECK (length(unit_name)<=120),
  supervisor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,id),
  FOREIGN KEY(company_id,supervisor_user_id) REFERENCES public.gc_memberships(company_id,user_id)
);
CREATE TABLE public.gc_team_members (
  company_id uuid NOT NULL,
  team_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT TRUE,
  PRIMARY KEY(company_id,team_id,seller_id),
  FOREIGN KEY(company_id,team_id) REFERENCES public.gc_teams(company_id,id),
  FOREIGN KEY(company_id,seller_id) REFERENCES public.gc_memberships(company_id,user_id)
);
CREATE TABLE public.gc_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.gc_companies(id),
  team_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  work_date date NOT NULL,
  shift text NOT NULL DEFAULT 'full' CHECK (shift IN ('full','morning','afternoon','evening')),
  atendimentos integer NOT NULL DEFAULT 0 CHECK (atendimentos>=0),
  vendas_imediatas integer NOT NULL DEFAULT 0 CHECK (vendas_imediatas>=0),
  agendamentos integer NOT NULL DEFAULT 0 CHECK (agendamentos>=0),
  retornos integer NOT NULL DEFAULT 0 CHECK (retornos>=0),
  vendas_retorno integer NOT NULL DEFAULT 0 CHECK (vendas_retorno>=0),
  cotas integer NOT NULL DEFAULT 0 CHECK (cotas>=0),
  valor_creditos numeric(16,2) NOT NULL DEFAULT 0 CHECK (valor_creditos>=0),
  notes text NOT NULL DEFAULT '' CHECK (length(notes)<=500),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','validated','returned')),
  returned_reason text NOT NULL DEFAULT '' CHECK (length(returned_reason)<=500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(company_id,team_id) REFERENCES public.gc_teams(company_id,id),
  FOREIGN KEY(company_id,seller_id) REFERENCES public.gc_memberships(company_id,user_id),
  UNIQUE(company_id,seller_id,work_date,shift),
  CONSTRAINT gc_immediate_le_attend CHECK (vendas_imediatas<=atendimentos),
  CONSTRAINT gc_return_le_return CHECK (vendas_retorno<=retornos),
  CONSTRAINT gc_cotas_ge_buyers CHECK (cotas>=vendas_imediatas+vendas_retorno),
  CONSTRAINT gc_return_reason CHECK (status<>'returned' OR length(btrim(returned_reason))>0)
);
CREATE INDEX gc_reports_period_idx ON public.gc_daily_reports(company_id,work_date,seller_id);
CREATE TABLE public.gc_coaching_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.gc_companies(id),
  seller_id uuid NOT NULL,
  supervisor_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  indicator text NOT NULL CHECK(length(btrim(indicator)) BETWEEN 2 AND 100),
  diagnosis text NOT NULL CHECK(length(btrim(diagnosis)) BETWEEN 2 AND 700),
  action_plan text NOT NULL CHECK(length(btrim(action_plan)) BETWEEN 2 AND 700),
  review_date date NOT NULL,
  acknowledged_at timestamptz,
  review_status text CHECK (review_status IN ('improved','stable','needs_support')),
  review_notes text CHECK (length(review_notes)<=700),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(company_id,seller_id) REFERENCES public.gc_memberships(company_id,user_id),
  FOREIGN KEY(company_id,supervisor_id) REFERENCES public.gc_memberships(company_id,user_id),
  CONSTRAINT gc_feedback_period CHECK (period_start<=period_end AND review_date>=period_end),
  CONSTRAINT gc_feedback_review_consistent CHECK ((reviewed_at IS NULL AND review_status IS NULL) OR (reviewed_at IS NOT NULL AND review_status IS NOT NULL))
);
CREATE INDEX gc_feedback_seller_idx ON public.gc_coaching_feedback(company_id,seller_id,created_at);
CREATE TABLE public.gc_report_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.gc_companies(id),
  report_id uuid NOT NULL REFERENCES public.gc_daily_reports(id),
  event text NOT NULL CHECK (event IN ('insert','update')),
  changed_by uuid REFERENCES auth.users(id),
  old_row jsonb,
  new_row jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.gc_feedback_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.gc_companies(id),
  feedback_id uuid NOT NULL REFERENCES public.gc_coaching_feedback(id),
  event text NOT NULL CHECK (event IN ('insert','update')),
  changed_by uuid REFERENCES auth.users(id),
  old_row jsonb,
  new_row jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Funções de autorização mantidas em schema NÃO EXPOSTO. Nenhuma delas permite escrita.
CREATE FUNCTION gc_private.is_member(p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.gc_memberships m WHERE m.company_id=p_company AND m.user_id=(SELECT auth.uid()) AND m.active)
$$;
CREATE FUNCTION gc_private.has_role(p_company uuid,p_role text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.gc_memberships m WHERE m.company_id=p_company AND m.user_id=(SELECT auth.uid()) AND m.active AND m.role=p_role)
$$;
CREATE FUNCTION gc_private.supervises_seller(p_company uuid,p_seller uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
   SELECT 1 FROM public.gc_teams t
   JOIN public.gc_team_members tm ON tm.company_id=t.company_id AND tm.team_id=t.id AND tm.active
   JOIN public.gc_memberships s ON s.company_id=t.company_id AND s.user_id=tm.seller_id AND s.active AND s.role='seller'
   JOIN public.gc_memberships sup ON sup.company_id=t.company_id AND sup.user_id=t.supervisor_user_id AND sup.active AND sup.role='supervisor'
   WHERE t.company_id=p_company AND tm.seller_id=p_seller AND t.supervisor_user_id=(SELECT auth.uid())
 )
$$;
CREATE FUNCTION gc_private.can_read_seller(p_company uuid,p_seller uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT gc_private.is_member(p_company) AND (
   p_seller=(SELECT auth.uid()) OR gc_private.has_role(p_company,'manager') OR gc_private.supervises_seller(p_company,p_seller))
$$;
CREATE FUNCTION gc_private.can_review_seller(p_company uuid,p_seller uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT gc_private.has_role(p_company,'manager') OR gc_private.supervises_seller(p_company,p_seller)
$$;
CREATE FUNCTION gc_private.is_assigned(p_company uuid,p_team uuid,p_seller uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
   SELECT 1 FROM public.gc_team_members tm
   JOIN public.gc_memberships m ON m.company_id=tm.company_id AND m.user_id=tm.seller_id AND m.active AND m.role='seller'
   WHERE tm.company_id=p_company AND tm.team_id=p_team AND tm.seller_id=p_seller AND tm.active
 )
$$;

CREATE FUNCTION gc_private.is_active_seller(p_company uuid,p_seller uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.gc_memberships m
 WHERE m.company_id=p_company AND m.user_id=p_seller AND m.role='seller' AND m.active)
$$;

-- O banco, não o browser, controla transições e protege alterações de conteúdo.
CREATE FUNCTION gc_private.guard_report_insert() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.seller_id IS DISTINCT FROM (SELECT auth.uid()) OR NOT gc_private.is_assigned(NEW.company_id,NEW.team_id,NEW.seller_id)
    OR NEW.status NOT IN ('draft','submitted') OR NEW.returned_reason<>'' THEN
   RAISE EXCEPTION 'Lançamento não autorizado';
 END IF;
 NEW.created_at=now(); NEW.updated_at=now(); RETURN NEW;
END; $$;
CREATE FUNCTION gc_private.guard_report_update() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF (to_jsonb(NEW)-'updated_at') IS NULL THEN RAISE EXCEPTION 'Registro inválido'; END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.company_id IS DISTINCT FROM OLD.company_id OR
    NEW.team_id IS DISTINCT FROM OLD.team_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id OR
    NEW.work_date IS DISTINCT FROM OLD.work_date OR NEW.shift IS DISTINCT FROM OLD.shift OR
    NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Identidade do lançamento é imutável';
 END IF;
 IF (SELECT auth.uid())=OLD.seller_id THEN
   IF OLD.status NOT IN ('draft','returned') OR NEW.status NOT IN ('draft','submitted') OR
      NOT gc_private.is_assigned(OLD.company_id,OLD.team_id,OLD.seller_id) THEN
     RAISE EXCEPTION 'Alteração não autorizada para vendedor';
   END IF;
   -- O vendedor não pode conservar justificativas antigas nem editar o fluxo do supervisor.
   IF NEW.returned_reason<>'' THEN RAISE EXCEPTION 'Motivo de devolução deve ser removido'; END IF;
 ELSIF gc_private.can_review_seller(OLD.company_id,OLD.seller_id) THEN
   IF OLD.status<>'submitted' OR NEW.status NOT IN ('validated','returned') OR
      (to_jsonb(NEW)-'status'-'returned_reason'-'updated_at') <>
      (to_jsonb(OLD)-'status'-'returned_reason'-'updated_at') THEN
     RAISE EXCEPTION 'Supervisor só pode validar ou devolver';
   END IF;
   IF NEW.status='validated' AND NEW.returned_reason<>'' THEN
     RAISE EXCEPTION 'Validação não admite motivo de devolução';
   END IF;
 ELSE RAISE EXCEPTION 'Alteração não autorizada'; END IF;
 NEW.updated_at=now(); RETURN NEW;
END; $$;
CREATE FUNCTION gc_private.guard_feedback_insert() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.supervisor_id IS DISTINCT FROM (SELECT auth.uid()) OR
    NOT gc_private.is_active_seller(NEW.company_id,NEW.seller_id) OR
    NOT gc_private.can_review_seller(NEW.company_id,NEW.seller_id) OR
    NEW.acknowledged_at IS NOT NULL OR NEW.reviewed_at IS NOT NULL OR
    NEW.review_status IS NOT NULL OR NEW.review_notes IS NOT NULL THEN
   RAISE EXCEPTION 'Feedback inicial não autorizado';
 END IF;
 NEW.created_at=now(); RETURN NEW;
END; $$;
CREATE FUNCTION gc_private.guard_feedback_update() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF (SELECT auth.uid())=OLD.seller_id AND OLD.acknowledged_at IS NULL THEN
   IF NEW.acknowledged_at IS NULL OR (to_jsonb(NEW)-'acknowledged_at')<>(to_jsonb(OLD)-'acknowledged_at') THEN
     RAISE EXCEPTION 'Vendedor só pode confirmar leitura';
   END IF;
   NEW.acknowledged_at=now();
 ELSIF gc_private.can_review_seller(OLD.company_id,OLD.seller_id) AND OLD.reviewed_at IS NULL THEN
   IF NEW.review_status IS NULL OR NEW.reviewed_at IS NULL OR
      (to_jsonb(NEW)-'review_status'-'review_notes'-'reviewed_at') <>
      (to_jsonb(OLD)-'review_status'-'review_notes'-'reviewed_at') THEN
      RAISE EXCEPTION 'Supervisor só pode registrar revisão uma vez';
   END IF;
   NEW.reviewed_at=now();
 ELSE RAISE EXCEPTION 'Edição de feedback não autorizada'; END IF;
 RETURN NEW;
END; $$;
-- Registros de auditoria são criados pelo banco e nunca expostos diretamente no browser.
CREATE FUNCTION gc_private.audit_report_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.gc_report_audit(company_id,report_id,event,changed_by,old_row,new_row)
 VALUES(NEW.company_id,NEW.id,lower(TG_OP),(SELECT auth.uid()),CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
 RETURN NEW;
END; $$;
CREATE FUNCTION gc_private.audit_feedback_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.gc_feedback_audit(company_id,feedback_id,event,changed_by,old_row,new_row)
 VALUES(NEW.company_id,NEW.id,lower(TG_OP),(SELECT auth.uid()),CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
 RETURN NEW;
END; $$;
CREATE TRIGGER gc_reports_insert_guard BEFORE INSERT ON public.gc_daily_reports FOR EACH ROW EXECUTE FUNCTION gc_private.guard_report_insert();
CREATE TRIGGER gc_reports_update_guard BEFORE UPDATE ON public.gc_daily_reports FOR EACH ROW EXECUTE FUNCTION gc_private.guard_report_update();
CREATE TRIGGER gc_reports_audit AFTER INSERT OR UPDATE ON public.gc_daily_reports FOR EACH ROW EXECUTE FUNCTION gc_private.audit_report_change();
CREATE TRIGGER gc_feedback_insert_guard BEFORE INSERT ON public.gc_coaching_feedback FOR EACH ROW EXECUTE FUNCTION gc_private.guard_feedback_insert();
CREATE TRIGGER gc_feedback_update_guard BEFORE UPDATE ON public.gc_coaching_feedback FOR EACH ROW EXECUTE FUNCTION gc_private.guard_feedback_update();
CREATE TRIGGER gc_feedback_audit AFTER INSERT OR UPDATE ON public.gc_coaching_feedback FOR EACH ROW EXECUTE FUNCTION gc_private.audit_feedback_change();

ALTER TABLE public.gc_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_coaching_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_report_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_feedback_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY gc_company_read ON public.gc_companies FOR SELECT TO authenticated USING (gc_private.is_member(id));
CREATE POLICY gc_memberships_read ON public.gc_memberships FOR SELECT TO authenticated USING (
 user_id=(SELECT auth.uid()) OR gc_private.has_role(company_id,'manager') OR gc_private.supervises_seller(company_id,user_id));
CREATE POLICY gc_team_read ON public.gc_teams FOR SELECT TO authenticated USING (gc_private.is_member(company_id));
CREATE POLICY gc_team_member_read ON public.gc_team_members FOR SELECT TO authenticated USING (gc_private.can_read_seller(company_id,seller_id));
CREATE POLICY gc_reports_read ON public.gc_daily_reports FOR SELECT TO authenticated USING (gc_private.can_read_seller(company_id,seller_id));
CREATE POLICY gc_reports_insert ON public.gc_daily_reports FOR INSERT TO authenticated WITH CHECK (
 seller_id=(SELECT auth.uid()) AND status IN ('draft','submitted') AND gc_private.is_member(company_id) AND gc_private.is_assigned(company_id,team_id,seller_id));
CREATE POLICY gc_reports_update_seller ON public.gc_daily_reports FOR UPDATE TO authenticated
 USING (seller_id=(SELECT auth.uid()) AND status IN ('draft','returned') AND gc_private.is_member(company_id))
 WITH CHECK (seller_id=(SELECT auth.uid()) AND status IN ('draft','submitted') AND gc_private.is_member(company_id) AND gc_private.is_assigned(company_id,team_id,seller_id));
CREATE POLICY gc_reports_review ON public.gc_daily_reports FOR UPDATE TO authenticated
 USING (status='submitted' AND gc_private.can_review_seller(company_id,seller_id))
 WITH CHECK (status IN ('validated','returned') AND gc_private.can_review_seller(company_id,seller_id));
CREATE POLICY gc_feedback_read ON public.gc_coaching_feedback FOR SELECT TO authenticated USING (gc_private.can_read_seller(company_id,seller_id));
CREATE POLICY gc_feedback_insert ON public.gc_coaching_feedback FOR INSERT TO authenticated
 WITH CHECK (supervisor_id=(SELECT auth.uid()) AND gc_private.is_active_seller(company_id,seller_id) AND gc_private.can_review_seller(company_id,seller_id));
CREATE POLICY gc_feedback_ack ON public.gc_coaching_feedback FOR UPDATE TO authenticated
 USING (seller_id=(SELECT auth.uid()) AND acknowledged_at IS NULL AND gc_private.is_member(company_id))
 WITH CHECK (seller_id=(SELECT auth.uid()) AND acknowledged_at IS NOT NULL AND gc_private.is_member(company_id));
CREATE POLICY gc_feedback_review ON public.gc_coaching_feedback FOR UPDATE TO authenticated
 USING (reviewed_at IS NULL AND gc_private.can_review_seller(company_id,seller_id))
 WITH CHECK (reviewed_at IS NOT NULL AND gc_private.can_review_seller(company_id,seller_id));

-- Acesso mínimo à Data API. Sem políticas de insert em entidades administrativas.
REVOKE ALL ON public.gc_companies,public.gc_memberships,public.gc_teams,public.gc_team_members,
 public.gc_daily_reports,public.gc_coaching_feedback,public.gc_report_audit,public.gc_feedback_audit FROM anon,authenticated;
GRANT SELECT ON public.gc_companies,public.gc_memberships,public.gc_teams,public.gc_team_members TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gc_daily_reports,public.gc_coaching_feedback TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA gc_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION gc_private.is_member(uuid),gc_private.has_role(uuid,text),
 gc_private.supervises_seller(uuid,uuid),gc_private.can_read_seller(uuid,uuid),
 gc_private.can_review_seller(uuid,uuid),gc_private.is_assigned(uuid,uuid,uuid),
 gc_private.is_active_seller(uuid,uuid) TO authenticated;
-- Sem políticas em tabelas de auditoria -> nenhum usuário cliente lê ou modifica logs.
COMMIT;
