-- EPSA Gestão Comercial v0.9 — acompanhamento digital sem dados pessoais.
-- Somente Supabase temporário: tilrqwcymhghmpvxukur. Não aplicar em EPSA Core ou GVS.
BEGIN;
CREATE TABLE public.gc_digital_followup_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 opportunity_id uuid NOT NULL REFERENCES public.gc_digital_opportunities(id),
 company_id uuid NOT NULL REFERENCES public.gc_companies(id),
 seller_id uuid NOT NULL REFERENCES auth.users(id),
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 action_type text NOT NULL CHECK(action_type IN ('contacted','no_answer','rescheduled')),
 next_action_on date,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gc_digital_followups_by_opportunity ON public.gc_digital_followup_events(opportunity_id,id);
CREATE INDEX gc_digital_followups_by_company ON public.gc_digital_followup_events(company_id,created_at DESC);
ALTER TABLE public.gc_digital_followup_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gc_digital_followup_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gc_digital_followup_events TO authenticated;
GRANT INSERT(opportunity_id,action_type,next_action_on) ON public.gc_digital_followup_events TO authenticated;

CREATE POLICY gc_digital_followups_read ON public.gc_digital_followup_events FOR SELECT TO authenticated
 USING (
  gc_private.is_member(company_id) AND EXISTS (
   SELECT 1 FROM public.gc_digital_opportunities o
   WHERE o.id=gc_digital_followup_events.opportunity_id
    AND o.company_id=gc_digital_followup_events.company_id
    AND ((SELECT auth.uid())=o.seller_id OR gc_private.can_review_seller(o.company_id,o.seller_id))
  )
 );
CREATE POLICY gc_digital_followups_insert ON public.gc_digital_followup_events FOR INSERT TO authenticated
 WITH CHECK (
  gc_private.is_member(company_id)
  AND actor_id=(SELECT auth.uid())
  AND EXISTS (
   SELECT 1 FROM public.gc_digital_opportunities o
   WHERE o.id=gc_digital_followup_events.opportunity_id
    AND o.company_id=gc_digital_followup_events.company_id
    AND o.seller_id=gc_digital_followup_events.seller_id
    AND o.stage NOT IN ('won','lost')
    AND ((o.seller_id=(SELECT auth.uid()) AND gc_private.has_role(o.company_id,'seller'))
      OR gc_private.can_review_seller(o.company_id,o.seller_id))
  )
 );

CREATE FUNCTION gc_private.gc_guard_digital_followup_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE opp record;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
 SELECT o.id,o.company_id,o.seller_id,o.stage INTO opp
 FROM public.gc_digital_opportunities o WHERE o.id=NEW.opportunity_id;
 IF NOT FOUND OR opp.stage IN ('won','lost') THEN
  RAISE EXCEPTION 'Oportunidade inexistente, indisponível ou encerrada';
 END IF;
 IF NOT gc_private.is_member(opp.company_id) OR NOT
 ((opp.seller_id=(SELECT auth.uid()) AND gc_private.has_role(opp.company_id,'seller'))
  OR gc_private.can_review_seller(opp.company_id,opp.seller_id))
 THEN RAISE EXCEPTION 'Acompanhamento não autorizado'; END IF;
 NEW.company_id=opp.company_id;
 NEW.seller_id=opp.seller_id;
 NEW.actor_id=(SELECT auth.uid());
 NEW.created_at=now();
 RETURN NEW;
END; $$;
CREATE FUNCTION gc_private.gc_sync_digital_followup_date() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 UPDATE public.gc_digital_opportunities SET next_action_on=NEW.next_action_on
 WHERE id=NEW.opportunity_id AND company_id=NEW.company_id AND stage NOT IN ('won','lost');
 IF NOT FOUND THEN RAISE EXCEPTION 'Não foi possível atualizar a próxima ação'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER gc_digital_followup_guard BEFORE INSERT ON public.gc_digital_followup_events
 FOR EACH ROW EXECUTE FUNCTION gc_private.gc_guard_digital_followup_insert();
CREATE TRIGGER gc_digital_followup_sync AFTER INSERT ON public.gc_digital_followup_events
 FOR EACH ROW EXECUTE FUNCTION gc_private.gc_sync_digital_followup_date();
REVOKE ALL ON FUNCTION gc_private.gc_guard_digital_followup_insert() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION gc_private.gc_sync_digital_followup_date() FROM PUBLIC,anon,authenticated;

-- Trilha privada para correções de crédito estimado.
CREATE TABLE public.gc_digital_credit_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 opportunity_id uuid NOT NULL REFERENCES public.gc_digital_opportunities(id),
 company_id uuid NOT NULL REFERENCES public.gc_companies(id),
 old_credit numeric(14,2) NOT NULL,
 new_credit numeric(14,2) NOT NULL,
 actor_id uuid,
 changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gc_digital_credit_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gc_digital_credit_audit FROM PUBLIC,anon,authenticated;
CREATE INDEX gc_digital_credit_audit_opportunity_idx ON public.gc_digital_credit_audit(opportunity_id);
CREATE FUNCTION gc_private.gc_audit_digital_credit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.estimated_credit IS DISTINCT FROM OLD.estimated_credit THEN
  INSERT INTO public.gc_digital_credit_audit
   (opportunity_id,company_id,old_credit,new_credit,actor_id)
   VALUES(NEW.id,NEW.company_id,OLD.estimated_credit,NEW.estimated_credit,(SELECT auth.uid()));
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER gc_digital_credit_audit_guard AFTER UPDATE ON public.gc_digital_opportunities
 FOR EACH ROW EXECUTE FUNCTION gc_private.gc_audit_digital_credit();
REVOKE ALL ON FUNCTION gc_private.gc_audit_digital_credit() FROM PUBLIC,anon,authenticated;
COMMIT;