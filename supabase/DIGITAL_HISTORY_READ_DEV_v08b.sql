-- v0.8b: leitura controlada do histórico de mudanças de etapa.
-- Auditoria permanece gravável apenas por trigger no banco. Somente Supabase temporário.
BEGIN;
GRANT SELECT ON public.gc_digital_stage_events TO authenticated;
CREATE POLICY gc_digital_stage_events_read ON public.gc_digital_stage_events
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.gc_digital_opportunities o
    WHERE o.id=gc_digital_stage_events.opportunity_id
      AND o.company_id=gc_digital_stage_events.company_id
      AND gc_private.is_member(o.company_id)
      AND (
        o.seller_id=(SELECT auth.uid())
        OR gc_private.can_review_seller(o.company_id,o.seller_id)
      )
  )
);
COMMIT;
