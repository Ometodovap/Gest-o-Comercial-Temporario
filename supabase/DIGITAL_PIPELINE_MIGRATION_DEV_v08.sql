-- EPSA Gestão Comercial v0.8: oportunidades digitais SEM dados pessoais de clientes.
-- EXCLUSIVO para Supabase de homologação: tilrqwcymhghmpvxukur.
-- Não executar nas bases EPSA Core ou GVS. Migração aditiva.
CREATE TABLE public.gc_digital_opportunities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL,
 team_id uuid NOT NULL,
 seller_id uuid NOT NULL,
 source text NOT NULL CHECK (source IN ('site','whatsapp','ads','social','indicacao','outro')),
 product text NOT NULL CHECK (product IN ('auto','imovel')),
 stage text NOT NULL DEFAULT 'prospecting' CHECK(stage IN ('prospecting','contacted','qualified','proposal','negotiation','won','lost')),
 estimated_credit numeric(14,2) NOT NULL DEFAULT 0 CHECK (estimated_credit>=0 AND estimated_credit<=1000000000000),
 next_action_on date,
 lost_reason text CHECK(lost_reason IN ('sem_interesse','sem_orcamento','sem_retorno','duplicado','outro')),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT gc_digital_company_team_fk FOREIGN KEY (company_id,team_id) REFERENCES public.gc_teams(company_id,id),
 CONSTRAINT gc_digital_company_seller_fk FOREIGN KEY (company_id,seller_id) REFERENCES public.gc_memberships(company_id,user_id),
 CONSTRAINT gc_digital_lost_reason_valid CHECK ((stage='lost' AND lost_reason IS NOT NULL) OR (stage<>'lost' AND lost_reason IS NULL))
);
CREATE INDEX gc_digital_company_stage_idx ON public.gc_digital_opportunities(company_id,stage);
CREATE INDEX gc_digital_seller_idx ON public.gc_digital_opportunities(seller_id);
CREATE INDEX gc_digital_team_idx ON public.gc_digital_opportunities(company_id,team_id);
CREATE INDEX gc_digital_next_action_idx ON public.gc_digital_opportunities(next_action_on);
ALTER TABLE public.gc_digital_opportunities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gc_digital_opportunities FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gc_digital_opportunities TO authenticated;
GRANT INSERT(company_id,team_id,seller_id,source,product,estimated_credit,next_action_on) ON public.gc_digital_opportunities TO authenticated;
GRANT UPDATE(stage,estimated_credit,next_action_on,lost_reason) ON public.gc_digital_opportunities TO authenticated;

CREATE POLICY gc_digital_read ON public.gc_digital_opportunities FOR SELECT TO authenticated
 USING (gc_private.is_member(company_id) AND ((SELECT auth.uid())=seller_id OR gc_private.can_review_seller(company_id,seller_id)));
CREATE POLICY gc_digital_insert ON public.gc_digital_opportunities FOR INSERT TO authenticated
 WITH CHECK (
  gc_private.is_member(company_id) AND gc_private.is_assigned(company_id,team_id,seller_id)
  AND ((seller_id=(SELECT auth.uid()) AND gc_private.has_role(company_id,'seller')) OR gc_private.can_review_seller(company_id,seller_id))
 );
CREATE POLICY gc_digital_update ON public.gc_digital_opportunities FOR UPDATE TO authenticated
 USING (gc_private.is_member(company_id) AND ((seller_id=(SELECT auth.uid()) AND gc_private.has_role(company_id,'seller')) OR gc_private.can_review_seller(company_id,seller_id)))
 WITH CHECK (gc_private.is_member(company_id) AND ((seller_id=(SELECT auth.uid()) AND gc_private.has_role(company_id,'seller')) OR gc_private.can_review_seller(company_id,seller_id)));

CREATE FUNCTION gc_private.gc_digital_before_insert() RETURNS trigger LANGUAGE plpgsql
 SET search_path='' AS $$
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT gc_private.is_member(NEW.company_id)
 OR NOT gc_private.is_assigned(NEW.company_id,NEW.team_id,NEW.seller_id)
 OR NOT (
  (NEW.seller_id=(SELECT auth.uid()) AND gc_private.has_role(NEW.company_id,'seller'))
  OR gc_private.can_review_seller(NEW.company_id,NEW.seller_id)
 ) THEN RAISE EXCEPTION 'Usuário não autorizado para essa oportunidade'; END IF;
 NEW.stage='prospecting';NEW.lost_reason=NULL;
 NEW.created_by=(SELECT auth.uid());NEW.updated_by=(SELECT auth.uid());
 NEW.created_at=now();NEW.updated_at=now();
 RETURN NEW;
END; $$;
CREATE FUNCTION gc_private.gc_digital_before_update() RETURNS trigger LANGUAGE plpgsql
 SET search_path='' AS $$
DECLARE old_step integer; new_step integer;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT gc_private.is_member(OLD.company_id)
 OR NOT ((OLD.seller_id=(SELECT auth.uid()) AND gc_private.has_role(OLD.company_id,'seller')) OR gc_private.can_review_seller(OLD.company_id,OLD.seller_id))
 THEN RAISE EXCEPTION 'Atualização digital não autorizada'; END IF;
 IF (to_jsonb(NEW)-'stage'-'estimated_credit'-'next_action_on'-'lost_reason'-'updated_at'-'updated_by')
   <> (to_jsonb(OLD)-'stage'-'estimated_credit'-'next_action_on'-'lost_reason'-'updated_at'-'updated_by')
 THEN RAISE EXCEPTION 'Identidade e origem da oportunidade não podem ser alteradas'; END IF;
 IF NEW.stage<>OLD.stage THEN
  IF OLD.stage IN ('won','lost') THEN RAISE EXCEPTION 'Venda concluída ou oportunidade perdida não pode ser reaberta';END IF;
  old_step=array_position(ARRAY['prospecting','contacted','qualified','proposal','negotiation','won'],OLD.stage);
  new_step=array_position(ARRAY['prospecting','contacted','qualified','proposal','negotiation','won'],NEW.stage);
  IF NEW.stage<>'lost' AND (new_step IS NULL OR new_step<=old_step)
  THEN RAISE EXCEPTION 'Transição inválida entre etapas do funil';END IF;
 END IF;
 IF NEW.stage='lost' AND NEW.lost_reason IS NULL THEN RAISE EXCEPTION 'Informe motivo de perda';END IF;
 IF NEW.stage<>'lost' AND NEW.lost_reason IS NOT NULL THEN RAISE EXCEPTION 'Motivo de perda somente para oportunidades perdidas';END IF;
 NEW.updated_by=(SELECT auth.uid());NEW.updated_at=now();
 RETURN NEW;
END; $$;
CREATE TRIGGER gc_digital_guard_insert BEFORE INSERT ON public.gc_digital_opportunities FOR EACH ROW
 EXECUTE FUNCTION gc_private.gc_digital_before_insert();
CREATE TRIGGER gc_digital_guard_update BEFORE UPDATE ON public.gc_digital_opportunities FOR EACH ROW
 EXECUTE FUNCTION gc_private.gc_digital_before_update();
REVOKE ALL ON FUNCTION gc_private.gc_digital_before_insert() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION gc_private.gc_digital_before_update() FROM PUBLIC,anon,authenticated;

CREATE TABLE public.gc_digital_stage_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 opportunity_id uuid NOT NULL REFERENCES public.gc_digital_opportunities(id),
 company_id uuid NOT NULL,
 actor_id uuid,
 old_stage text,
 new_stage text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gc_digital_stage_events_opp_idx ON public.gc_digital_stage_events(opportunity_id,created_at);
ALTER TABLE public.gc_digital_stage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gc_digital_stage_events FROM PUBLIC,anon,authenticated;
CREATE FUNCTION gc_private.gc_digital_audit_stage() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage THEN
  INSERT INTO public.gc_digital_stage_events(opportunity_id,company_id,actor_id,old_stage,new_stage)
  VALUES (NEW.id,NEW.company_id,(SELECT auth.uid()),
   CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.stage END,NEW.stage);
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER gc_digital_audit_stage AFTER INSERT OR UPDATE ON public.gc_digital_opportunities FOR EACH ROW
 EXECUTE FUNCTION gc_private.gc_digital_audit_stage();
REVOKE ALL ON FUNCTION gc_private.gc_digital_audit_stage() FROM PUBLIC,anon,authenticated;
