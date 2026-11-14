-- EPSA Gestão Comercial v0.11 — auditoria apenas de leitura.
-- Executar SOMENTE no Supabase temporário. Nenhuma tabela será alterada.
-- O alerta INFO sobre auditorias sem policies é esperado.
WITH tables AS (
 SELECT c.oid,c.relname,c.relrowsecurity,
   has_table_privilege('anon',c.oid,'SELECT') anon_select,
   has_table_privilege('anon',c.oid,'INSERT') anon_insert
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'gc_%'
),
functions AS (
 SELECT p.oid,p.proname,p.prosecdef,n.nspname
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='gc_private'
),
defaults AS (
 SELECT d.defaclobjtype,pg_get_userbyid(d.defaclrole) role_name,d.defaclacl::text grants
 FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace
 WHERE n.nspname='public'
)
SELECT 'tables' AS check_type,
 'GC tables total' AS check_name,
 count(*)::text AS result FROM tables
UNION ALL SELECT 'rls','GC tables without RLS',count(*)::text FROM tables WHERE NOT relrowsecurity
UNION ALL SELECT 'access','GC tables with anonymous SELECT',count(*)::text FROM tables WHERE anon_select
UNION ALL SELECT 'access','GC tables with anonymous INSERT',count(*)::text FROM tables WHERE anon_insert
UNION ALL SELECT 'private_functions','GC private functions callable by anon',count(*)::text FROM functions WHERE has_function_privilege('anon',oid,'EXECUTE')
UNION ALL SELECT 'audit','Audit tables without RLS',
 count(*)::text FROM tables WHERE relname LIKE '%_audit' AND NOT relrowsecurity
UNION ALL SELECT 'defaults','PUBLIC default grants (inspect SQL before change)',
 coalesce(string_agg(role_name||' ['||defaclobjtype::text||'] '||grants,' ; '),'none') FROM defaults;
