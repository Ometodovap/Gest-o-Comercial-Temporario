-- Correção complementar, já aplicada no Supabase temporário.
CREATE OR REPLACE FUNCTION gc_private.gc_digital_before_update() RETURNS trigger LANGUAGE plpgsql
 SET search_path='' AS $$
DECLARE old_step integer; new_step integer;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT gc_private.is_member(OLD.company_id)
 OR NOT ((OLD.seller_id=(SELECT auth.uid()) AND gc_private.has_role(OLD.company_id,'seller')) OR gc_private.can_review_seller(OLD.company_id,OLD.seller_id))
 THEN RAISE EXCEPTION 'Atualização digital não autorizada'; END IF;
 IF (to_jsonb(NEW)-'stage'-'estimated_credit'-'next_action_on'-'lost_reason'-'updated_at'-'updated_by')
   <> (to_jsonb(OLD)-'stage'-'estimated_credit'-'next_action_on'-'lost_reason'-'updated_at'-'updated_by')
 THEN RAISE EXCEPTION 'Identidade e origem da oportunidade não podem ser alteradas'; END IF;
 IF OLD.stage IN ('won','lost') THEN RAISE EXCEPTION 'Oportunidade encerrada não pode ser alterada';END IF;
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
