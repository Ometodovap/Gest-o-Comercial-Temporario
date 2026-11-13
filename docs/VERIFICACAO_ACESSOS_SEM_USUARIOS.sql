-- SOMENTE no projeto Gestao Comercial Temporario.
-- Diagnostico de somente leitura; sem criar usuarios ou contas.
SELECT n.nspname || '.' || c.relname AS tabela,
       c.relrowsecurity AS rls_ativo,
       has_table_privilege('anon',c.oid,'SELECT') AS anon_pode_ler,
       has_table_privilege('authenticated',c.oid,'SELECT') AS autenticado_pode_ler,
       has_table_privilege('authenticated',c.oid,'INSERT') AS autenticado_pode_inserir,
       has_table_privilege('authenticated',c.oid,'UPDATE') AS autenticado_pode_alterar,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) AS politicas
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'gc_%'
ORDER BY c.relname;

SELECT (SELECT count(*) FROM auth.users) AS usuarios_auth,
       (SELECT count(*) FROM public.gc_companies) AS empresas_teste,
       (SELECT count(*) FROM public.gc_teams) AS stands_teste,
       (SELECT count(*) FROM public.gc_memberships) AS usuarios_vinculados,
       (SELECT count(*) FROM public.gc_daily_reports) AS lancamentos;
