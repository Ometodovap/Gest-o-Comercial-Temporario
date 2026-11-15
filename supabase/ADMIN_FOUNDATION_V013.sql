-- EPSA Gestao Comercial v0.13 — tenant administration, isolated homologation project.
CREATE TABLE IF NOT EXISTS gc_private.gc_admin_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 company_id uuid NOT NULL,
 actor_user_id uuid NOT NULL,
 operation text NOT NULL,
 subject_user_id uuid,
 subject_team_id uuid,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 details jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE gc_private.gc_admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON gc_private.gc_admin_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE gc_private.gc_admin_audit_id_seq FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS gc_admin_audit_company_idx ON gc_private.gc_admin_audit(company_id,occurred_at DESC);

CREATE OR REPLACE FUNCTION gc_private.gc_admin_create_company_impl(p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_id uuid;v_actor text;
BEGIN
 SELECT display_name INTO v_actor FROM public.gc_memberships WHERE user_id=v_uid AND role='manager' AND active ORDER BY created_at LIMIT 1;
 IF v_uid IS NULL OR v_actor IS NULL THEN RAISE EXCEPTION 'Apenas diretoria ativa pode criar empresas' USING ERRCODE='42501'; END IF;
 p_name:=pg_catalog.btrim(p_name);
 IF p_name IS NULL OR pg_catalog.length(p_name)<2 OR pg_catalog.length(p_name)>180 THEN
   RAISE EXCEPTION 'Nome da empresa deve conter 2 a 180 caracteres' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM gc_private.gc_admin_audit WHERE actor_user_id=v_uid AND operation='create_company' AND occurred_at>now()-interval '30 days')>=3
 THEN RAISE EXCEPTION 'Limite de cadastros atingido' USING ERRCODE='42501'; END IF;
 INSERT INTO public.gc_companies(name) VALUES(p_name) RETURNING id INTO v_id;
 INSERT INTO public.gc_memberships(company_id,user_id,role,display_name,active) VALUES(v_id,v_uid,'manager',v_actor,true);
 INSERT INTO gc_private.gc_admin_audit(company_id,actor_user_id,operation,details) VALUES(v_id,v_uid,'create_company',pg_catalog.jsonb_build_object('name',p_name));
 RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION gc_private.gc_admin_rename_company_impl(p_company_id uuid,p_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
 IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.gc_memberships WHERE company_id=p_company_id AND user_id=v_uid AND active AND role='manager')
 THEN RAISE EXCEPTION 'Permissao negada' USING ERRCODE='42501'; END IF;
 p_name:=pg_catalog.btrim(p_name);
 IF p_name IS NULL OR pg_catalog.length(p_name)<2 OR pg_catalog.length(p_name)>180 THEN RAISE EXCEPTION 'Nome invalido' USING ERRCODE='22023'; END IF;
 UPDATE public.gc_companies SET name=p_name WHERE id=p_company_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Empresa nao encontrada' USING ERRCODE='P0002'; END IF;
 INSERT INTO gc_private.gc_admin_audit(company_id,actor_user_id,operation,details) VALUES(p_company_id,v_uid,'rename_company',pg_catalog.jsonb_build_object('name',p_name));
END $$;

CREATE OR REPLACE FUNCTION gc_private.gc_admin_save_member_impl(p_company_id uuid,p_user_id uuid,p_display_name text,p_role text,p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_prior text;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.gc_memberships WHERE company_id=p_company_id AND user_id=v_uid AND active AND role='manager')
 THEN RAISE EXCEPTION 'Somente diretoria pode administrar pessoas' USING ERRCODE='42501'; END IF;
 IF p_user_id IS NULL OR p_user_id=v_uid THEN RAISE EXCEPTION 'Nao altere seu proprio vinculo' USING ERRCODE='42501'; END IF;
 p_display_name:=pg_catalog.btrim(p_display_name);
 IF p_display_name IS NULL OR pg_catalog.length(p_display_name)<2 OR pg_catalog.length(p_display_name)>120 OR p_role IS NULL OR p_role NOT IN ('seller','supervisor') OR p_active IS NULL
 THEN RAISE EXCEPTION 'Nome, papel ou situacao invalida' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION 'Cadastre antes uma conta ficticia no Auth' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.gc_memberships WHERE user_id=p_user_id AND company_id<>p_company_id AND active)
 THEN RAISE EXCEPTION 'Conta vinculada a outra empresa ativa' USING ERRCODE='42501'; END IF;
 SELECT role INTO v_prior FROM public.gc_memberships WHERE company_id=p_company_id AND user_id=p_user_id FOR UPDATE;
 IF v_prior='manager' THEN RAISE EXCEPTION 'Vinculo de diretoria nao pode ser alterado' USING ERRCODE='42501'; END IF;
 IF (p_role<>'supervisor' OR NOT p_active) AND EXISTS(SELECT 1 FROM public.gc_teams WHERE company_id=p_company_id AND supervisor_user_id=p_user_id)
 THEN RAISE EXCEPTION 'Reatribua os stands antes de alterar a supervisao' USING ERRCODE='23514'; END IF;
 INSERT INTO public.gc_memberships(company_id,user_id,role,display_name,active)
 VALUES(p_company_id,p_user_id,p_role,p_display_name,p_active)
 ON CONFLICT(company_id,user_id) DO UPDATE SET role=excluded.role,display_name=excluded.display_name,active=excluded.active;
 IF p_role<>'seller' OR NOT p_active THEN UPDATE public.gc_team_members SET active=false WHERE company_id=p_company_id AND seller_id=p_user_id AND active; END IF;
 INSERT INTO gc_private.gc_admin_audit(company_id,actor_user_id,operation,subject_user_id,details)
 VALUES(p_company_id,v_uid,'save_member',p_user_id,pg_catalog.jsonb_build_object('role',p_role,'active',p_active));
END $$;

CREATE OR REPLACE FUNCTION gc_private.gc_admin_save_team_impl(p_company_id uuid,p_team_id uuid,p_name text,p_unit_name text,p_supervisor_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_id uuid;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.gc_memberships WHERE company_id=p_company_id AND user_id=v_uid AND active AND role='manager')
 THEN RAISE EXCEPTION 'Somente diretoria pode administrar stands' USING ERRCODE='42501'; END IF;
 p_name:=pg_catalog.btrim(p_name);p_unit_name:=coalesce(pg_catalog.btrim(p_unit_name),'');
 IF p_name IS NULL OR pg_catalog.length(p_name)<2 OR pg_catalog.length(p_name)>120 OR pg_catalog.length(p_unit_name)>120
 THEN RAISE EXCEPTION 'Stand invalido' USING ERRCODE='22023'; END IF;
 IF p_supervisor_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.gc_memberships WHERE company_id=p_company_id AND user_id=p_supervisor_user_id AND role='supervisor' AND active)
 THEN RAISE EXCEPTION 'Supervisor nao esta ativo nesta empresa' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM public.gc_teams WHERE company_id=p_company_id AND pg_catalog.lower(name)=pg_catalog.lower(p_name) AND (p_team_id IS NULL OR id<>p_team_id))
 THEN RAISE EXCEPTION 'Ja existe stand com este nome' USING ERRCODE='23505'; END IF;
 IF p_team_id IS NULL THEN
  INSERT INTO public.gc_teams(company_id,name,unit_name,supervisor_user_id) VALUES(p_company_id,p_name,p_unit_name,p_supervisor_user_id) RETURNING id INTO v_id;
 ELSE
  UPDATE public.gc_teams SET name=p_name,unit_name=p_unit_name,supervisor_user_id=p_supervisor_user_id WHERE company_id=p_company_id AND id=p_team_id RETURNING id INTO v_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stand nao pertence a empresa' USING ERRCODE='P0002'; END IF;
 END IF;
 INSERT INTO gc_private.gc_admin_audit(company_id,actor_user_id,operation,subject_team_id,details)
 VALUES(p_company_id,v_uid,'save_team',v_id,pg_catalog.jsonb_build_object('name',p_name));
 RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION gc_private.gc_admin_assign_seller_impl(p_company_id uuid,p_team_id uuid,p_seller_id uuid,p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
 IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.gc_memberships WHERE company_id=p_company_id AND user_id=v_uid AND active AND role='manager')
 THEN RAISE EXCEPTION 'Somente diretoria pode mover vendedores' USING ERRCODE='42501'; END IF;
 IF p_active IS NULL OR NOT EXISTS(SELECT 1 FROM public.gc_teams WHERE company_id=p_company_id AND id=p_team_id)
 THEN RAISE EXCEPTION 'Stand ou situacao invalidos' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.gc_memberships WHERE company_id=p_company_id AND user_id=p_seller_id AND role='seller' AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vendedor nao esta ativo na empresa' USING ERRCODE='23514'; END IF;
 IF p_active THEN UPDATE public.gc_team_members SET active=false WHERE company_id=p_company_id AND seller_id=p_seller_id AND team_id<>p_team_id AND active; END IF;
 INSERT INTO public.gc_team_members(company_id,team_id,seller_id,active) VALUES(p_company_id,p_team_id,p_seller_id,p_active)
 ON CONFLICT(company_id,team_id,seller_id) DO UPDATE SET active=excluded.active;
 INSERT INTO gc_private.gc_admin_audit(company_id,actor_user_id,operation,subject_team_id,subject_user_id,details)
 VALUES(p_company_id,v_uid,'assign_seller',p_team_id,p_seller_id,pg_catalog.jsonb_build_object('active',p_active));
END $$;

-- Security-invoker API wrappers. Privileged bodies live in the private schema.
CREATE OR REPLACE FUNCTION public.gc_admin_create_company(p_name text) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT gc_private.gc_admin_create_company_impl(p_name) $$;
CREATE OR REPLACE FUNCTION public.gc_admin_rename_company(p_company_id uuid,p_name text) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT gc_private.gc_admin_rename_company_impl(p_company_id,p_name) $$;
CREATE OR REPLACE FUNCTION public.gc_admin_save_member(p_company_id uuid,p_user_id uuid,p_display_name text,p_role text,p_active boolean) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT gc_private.gc_admin_save_member_impl(p_company_id,p_user_id,p_display_name,p_role,p_active) $$;
CREATE OR REPLACE FUNCTION public.gc_admin_save_team(p_company_id uuid,p_team_id uuid,p_name text,p_unit_name text,p_supervisor_user_id uuid) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT gc_private.gc_admin_save_team_impl(p_company_id,p_team_id,p_name,p_unit_name,p_supervisor_user_id) $$;
CREATE OR REPLACE FUNCTION public.gc_admin_assign_seller(p_company_id uuid,p_team_id uuid,p_seller_id uuid,p_active boolean) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT gc_private.gc_admin_assign_seller_impl(p_company_id,p_team_id,p_seller_id,p_active) $$;

REVOKE ALL ON FUNCTION gc_private.gc_admin_create_company_impl(text),gc_private.gc_admin_rename_company_impl(uuid,text),gc_private.gc_admin_save_member_impl(uuid,uuid,text,text,boolean),gc_private.gc_admin_save_team_impl(uuid,uuid,text,text,uuid),gc_private.gc_admin_assign_seller_impl(uuid,uuid,uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gc_admin_create_company(text),public.gc_admin_rename_company(uuid,text),public.gc_admin_save_member(uuid,uuid,text,text,boolean),public.gc_admin_save_team(uuid,uuid,text,text,uuid),public.gc_admin_assign_seller(uuid,uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION gc_private.gc_admin_create_company_impl(text),gc_private.gc_admin_rename_company_impl(uuid,text),gc_private.gc_admin_save_member_impl(uuid,uuid,text,text,boolean),gc_private.gc_admin_save_team_impl(uuid,uuid,text,text,uuid),gc_private.gc_admin_assign_seller_impl(uuid,uuid,uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gc_admin_create_company(text),public.gc_admin_rename_company(uuid,text),public.gc_admin_save_member(uuid,uuid,text,text,boolean),public.gc_admin_save_team(uuid,uuid,text,text,uuid),public.gc_admin_assign_seller(uuid,uuid,uuid,boolean) TO authenticated;
