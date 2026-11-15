# EPSA Gestão Comercial v0.12 — permissões padrão e revogação de acesso

## Escopo

Aplicativo de homologação no Supabase **Gestão Comercial Temporário** (`tilrqwcymhghmpvxukur`), separado dos bancos EPSA Core e GVS.

A migração `gc_secure_default_privileges_v012` foi aplicada em 14/11/2026, com versão `20261114212547`. **Não executar novamente manualmente.** O SQL foi registrado no GitHub em `supabase/migrations/20261114212547_gc_secure_default_privileges_v012.sql`.

## O que mudou no banco

- Para futuros objetos **criados pelo papel `postgres`** em `public`, o Supabase deixou de conceder automaticamente direitos a `anon`, `authenticated` e `service_role` em tabelas, sequências e funções.
- Para futuras funções criadas por `postgres` em **qualquer schema**, o padrão de `EXECUTE` para `PUBLIC` foi revogado. **Atenção:** novas funções auxiliares de RLS precisarão de `GRANT EXECUTE` explícito para os papéis que as invocam. Sempre testar novas migrações antes de promover.
- **Permissões atuais não foram alteradas.** Após a aplicação: 16 tabelas `public.gc_*`, 16 com RLS, 0 com leitura anônima; as tabelas existentes seguem acessíveis de acordo com seus `GRANT` e políticas.
- **`supabase_admin` não foi alterado.** É um papel interno da plataforma e suas permissões padrão não devem ser modificadas via `postgres`. No momento da auditoria não havia objetos no schema `public` pertencentes a ele.

Referências oficiais:
- https://supabase.com/docs/guides/api/securing-your-api#revoke-default-privileges
- https://supabase.com/kb/troubleshooting/cant-change-the-default-privileges-of-supabase_admin-in-the-public-schema-448af9

## Revogação de associação

As policies já existentes consultam `gc_memberships.active` em tempo real. Um teste SQL com `BEGIN`, desativação temporária, `SET LOCAL ROLE authenticated`, consultas RLS e `ROLLBACK` mostrou:
- Ana inativa: 0 relatórios, 0 oportunidades, 0 metas.
- Marcos inativo: 0 relatórios, 0 oportunidades, 0 follow-ups.
- Ambas as associações permaneceram `active=true` após a reversão.

O navegador agora consulta novamente a associação de usuário **no retorno à aba ou à janela**. Antes dessa verificação, oculta os dados antigos. Se a verificação falhar, o aplicativo não reutiliza o vínculo antigo. Se papel/empresa mudarem, a lista autorizada é atualizada. A revogação no servidor ocorre independentemente dessa atualização visual.

**Limitação:** se uma sessão permanecer com a aba continuamente aberta, a interface só reconsiderará as permissões no próximo foco, retorno à aba ou recarregamento. As policies RLS continuam autorizando cada consulta e gravação segundo o estado atual do banco.

## Autenticação: pendências para operação real

A organização está no **plano Free** e o Security Advisor sinaliza `auth_leaked_password_protection`. Esse bloqueio está disponível no plano **Pro ou superior**, conforme https://supabase.com/docs/guides/auth/password-security.

Não houve alteração de plano ou cobrança. É preciso definir MFA para administradores e supervisores, política de senhas, procedimentos de encerramento de sessões, retenção, e revisão de LGPD antes de lidar com informações reais.

## Homologação

1. PR no GitHub: confirmar `npm ci`, `npm audit --audit-level=high`, `npm test`, `npm run build` aprovados.
2. No preview, entrar como Marcos, visitar Vendas digitais, Resultados, Metas e equipe; conferir a oportunidade fictícia e os registros existentes.
3. Alternar para outra aba e retornar. A interface deve ocultar os dados momentaneamente, verificar associação e restaurar os dados permitidos.
4. Entrar como Ana. O painel gerencial restrito a supervisão não deve estar disponível.
5. A Empresa Parceira B não deve acessar registros da Empresa A.
6. Confirmar que a publicação atual permanece intacta até homologação da v0.12.

## Regras obrigatórias para qualquer nova migration

- Usar `RLS` e políticas **na mesma migração** que cria uma tabela exposta.
- Conceder só as colunas e operações necessárias com `GRANT` explícito.
- Conceder `EXECUTE` explicitamente para novas funções chamadas por papéis da API ou policies; controlar `search_path` e uso de `SECURITY DEFINER`.
- Nunca introduzir tabelas expostas com RLS desabilitada. Nunca usar chaves `service_role`/secret no navegador.
- Reexecutar os Advisors e testes RLS, incluindo remoção de vínculo enquanto há sessão válida.

**Status: v0.12 segura para homologação com dados fictícios; ainda não aprovada para informações reais de clientes.**
