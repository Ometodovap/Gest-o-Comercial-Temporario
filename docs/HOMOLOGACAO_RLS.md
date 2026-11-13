# Homologação — Supabase temporário

## Já executado em 13/11/2026

- Migração `gc_initial_dev_schema_v05` aplicada no projeto `tilrqwcymhghmpvxukur`.
- Oito tabelas com RLS habilitado; duas tabelas de auditoria não possuem políticas e não são expostas a usuários normais.
- Cadastradas duas empresas **fictícias** e dois stands de teste.
- Consulta com sessão `authenticated` sem associação retornou zero empresas visíveis.
- Não houve criação de contas Supabase Auth; nenhuma senha foi cadastrada por este projeto.

## Ainda precisa testar com usuários autenticados reais de teste

1. Em **Authentication > Users > Add user** no Supabase temporário, criar quatro usuários de teste: `ana@piloto.test`, `marcos@piloto.test`, `bia@parceira.test`, `carla@parceira.test`. Use senhas independentes e NÃO reutilize `Demo@2026`. Não use contas de clientes ou vendedores reais.
2. Executar no **SQL Editor do projeto temporário** `docs/CONFIGURACAO_USUARIOS_TESTE.sql`; ele falha sem os quatro usuários.
3. Em cada usuário de teste, entrar no aplicativo React pela tela de login.
4. Ana: enviar um fechamento; Marcos: validar ou devolver, registrar feedback; Ana: confirmar leitura; Marcos: revisar; Ana: consultar evolução.
5. Bia não pode visualizar dados, perfis ou feedbacks de Ana/Marcos, mesmo alterando manualmente IDs nas consultas. Carla não pode alterar os registros da empresa A. Confirmar as regras via cliente autenticado usando o JWT da sessão legítima.
6. Recarregar o navegador e confirmar persistência; testar logout; testar edição de fechamento já validado (deve negar).

## Restrições

- **Não publicar em produção** até concluir os testes de permissão multiempresa.
- Não compartilhar chaves `service_role`/secretas nem armazená-las no Vite.
- Não executar scripts em projetos EPSA Core Platform ou GVS Imóveis.
- Para o uso real, avaliar região de dados, LGPD, segurança, limites do serviço, onboarding administrativo e RLS com casos negativos.
