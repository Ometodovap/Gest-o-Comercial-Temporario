-- EPSA Gestão Comercial: vinculação de usuários de teste NO SUPABASE TEMPORÁRIO.
-- PRÉ-REQUISITO: criar estes 4 usuários em Authentication > Users > Add user,
-- com e-mails de teste e senhas INDIVIDUAIS, confirmando-os na interface.
-- Não execute este script em outra base.
-- Executar no SQL Editor apenas após os quatro usuários aparecerem em auth.users.
BEGIN;
DO $setup$
DECLARE
  v_ana uuid; v_marcos uuid; v_bia uuid; v_carla uuid;
  v_a uuid; v_b uuid; v_ta uuid; v_tb uuid;
BEGIN
 SELECT id INTO v_ana FROM auth.users WHERE email='ana@piloto.test';
 SELECT id INTO v_marcos FROM auth.users WHERE email='marcos@piloto.test';
 SELECT id INTO v_bia FROM auth.users WHERE email='bia@parceira.test';
 SELECT id INTO v_carla FROM auth.users WHERE email='carla@parceira.test';
 IF v_ana IS NULL OR v_marcos IS NULL OR v_bia IS NULL OR v_carla IS NULL THEN
  RAISE EXCEPTION 'Crie todos os quatro usuários no Supabase Auth antes de executar este script';
 END IF;
 SELECT id INTO STRICT v_a FROM public.gc_companies WHERE name='Empresa Piloto A';
 SELECT id INTO STRICT v_b FROM public.gc_companies WHERE name='Empresa Parceira B';
 SELECT id INTO STRICT v_ta FROM public.gc_teams WHERE company_id=v_a AND name='Stand Shopping A';
 SELECT id INTO STRICT v_tb FROM public.gc_teams WHERE company_id=v_b AND name='Stand Shopping B';
 INSERT INTO public.gc_memberships(company_id,user_id,role,display_name) VALUES
  (v_a,v_ana,'seller','Ana Martins'),
  (v_a,v_marcos,'supervisor','Marcos Pereira'),
  (v_b,v_bia,'seller','Bia Oliveira'),
  (v_b,v_carla,'supervisor','Carla Souza')
 ON CONFLICT (company_id,user_id) DO UPDATE SET role=excluded.role,display_name=excluded.display_name,active=true;
 UPDATE public.gc_teams SET supervisor_user_id=v_marcos WHERE id=v_ta AND company_id=v_a;
 UPDATE public.gc_teams SET supervisor_user_id=v_carla WHERE id=v_tb AND company_id=v_b;
 INSERT INTO public.gc_team_members(company_id,team_id,seller_id) VALUES
  (v_a,v_ta,v_ana), (v_b,v_tb,v_bia)
 ON CONFLICT (company_id,team_id,seller_id) DO UPDATE SET active=true;
END
$setup$;
COMMIT;
-- Verificação opcional (SQL Editor/admin):
SELECT c.name AS empresa,m.display_name AS usuario,m.role AS perfil
 FROM public.gc_memberships m JOIN public.gc_companies c ON c.id=m.company_id
 ORDER BY c.name,m.role;
