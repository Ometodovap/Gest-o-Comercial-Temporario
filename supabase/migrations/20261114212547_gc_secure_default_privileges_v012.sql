-- Gestão Comercial v0.12: futuros objetos do papel postgres ficam privados por padrão.
-- APLICADO somente em Supabase Gestao Comercial Temporario (tilrqwcymhghmpvxukur).
-- Os grants, dados e as políticas RLS dos objetos existentes não são alterados.
-- Cada novo objeto precisa de GRANT explícito e RLS conforme sua finalidade.
-- Referência: https://supabase.com/docs/guides/api/securing-your-api#revoke-default-privileges
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
-- Aplica-se também a funções futuras criadas por postgres em OUTROS schemas.
-- Novas funções de autorização usadas por RLS precisarão de GRANT EXECUTE explícito.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
