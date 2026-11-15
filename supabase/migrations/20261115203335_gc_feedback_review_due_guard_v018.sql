-- Aplicada somente no Supabase Gestão Comercial Temporário, versão 20261115203335.
-- A função anterior já existia. A única regra nova é o bloqueio de revisão antes de review_date no fuso de Brasília.
-- Não reexecutar manualmente neste projeto.
CREATE OR REPLACE FUNCTION gc_private.guard_feedback_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
 IF (SELECT auth.uid())=OLD.seller_id AND OLD.acknowledged_at IS NULL THEN
   IF NEW.acknowledged_at IS NULL OR (to_jsonb(NEW)-'acknowledged_at')<>(to_jsonb(OLD)-'acknowledged_at') THEN
     RAISE EXCEPTION 'Vendedor só pode confirmar leitura';
   END IF;
   NEW.acknowledged_at=now();
 ELSIF gc_private.can_review_seller(OLD.company_id,OLD.seller_id) AND OLD.reviewed_at IS NULL THEN
   IF (now() AT TIME ZONE 'America/Sao_Paulo')::date < OLD.review_date THEN
     RAISE EXCEPTION 'Revisão disponível somente na data agendada';
   END IF;
   IF NEW.review_status IS NULL OR NEW.reviewed_at IS NULL OR
      (to_jsonb(NEW)-'review_status'-'review_notes'-'reviewed_at') <>
      (to_jsonb(OLD)-'review_status'-'review_notes'-'reviewed_at') THEN
      RAISE EXCEPTION 'Supervisor só pode registrar revisão uma vez';
   END IF;
   NEW.reviewed_at=now();
 ELSE RAISE EXCEPTION 'Edição de feedback não autorizada'; END IF;
 RETURN NEW;
END; $function$;
