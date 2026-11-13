-- Roteiro adicional para SQL Editor, SOMENTE no projeto temporario.
-- Execute este arquivo APOS cadastrar os 4 usuarios no Auth e vinculá-los.
-- Simula as claims de usuario em uma transacao SEM alterar dados (ROLLBACK no fim).
-- Observacao: essa simulacao testa o mecanismo RLS no SQL Editor; os testes finais
-- ainda devem ser feitos no aplicativo via login real com cada conta.
BEGIN;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.gc_memberships WHERE active) <> 4 THEN
  RAISE EXCEPTION 'Ainda nao existem os quatro usuarios de homologacao vinculados';
 END IF;
END $$;
SELECT set_config('gc_test.ana', (SELECT user_id::text FROM public.gc_memberships WHERE display_name='Ana Martins'), true);
SELECT set_config('gc_test.bia', (SELECT user_id::text FROM public.gc_memberships WHERE display_name='Bia Oliveira'), true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('gc_test.ana'),true);
SELECT 'Ana' AS conta, name AS empresa_visivel FROM public.gc_companies ORDER BY name;
SELECT 'Ana' AS conta, COUNT(*) AS registros_visiveis_empresa_b FROM public.gc_daily_reports
WHERE company_id IN (SELECT id FROM public.gc_companies WHERE name='Empresa Parceira B');
SELECT set_config('request.jwt.claim.sub', current_setting('gc_test.bia'),true);
SELECT 'Bia' AS conta, name AS empresa_visivel FROM public.gc_companies ORDER BY name;
SELECT 'Bia' AS conta, COUNT(*) AS registros_visiveis_empresa_a FROM public.gc_daily_reports
WHERE company_id IN (SELECT id FROM public.gc_companies WHERE name='Empresa Piloto A');
ROLLBACK;
-- Resultado esperado: Ana enxerga somente Empresa Piloto A, Bia somente Empresa Parceira B,
-- ambas possuem zero registros visiveis da outra empresa.
