# Guard de MFA condicional no RLS — fase v0.24

**Ambiente:** somente Supabase Gestão Comercial Temporário (`tilrqwcymhghmpvxukur`), EPSA Gestão Comercial.

## Objetivo
Fechar a lacuna de acesso direto a tabelas comerciais em `aal1` para a **Diretoria já inscrita em MFA**, mantendo o piloto funcional para Marcos/Carla, ainda sem TOTP.

## Implementação
- Função privada `gc_private.gc_session_mfa_ok()`: exige `auth.uid()` válido e checa fator verificado em `auth.mfa_factors` com função SQL `STABLE SECURITY DEFINER` e `search_path` vazio.
- Para usuários com fator verificado, apenas token `aal2` permite operações comerciais. Sem fator verificado, a autorização existente continua em vigor.
- Policy `AS RESTRICTIVE FOR ALL TO authenticated` em **11 tabelas comerciais** com permissive policies existentes. Não altera as policies permissivas. Tabelas de auditoria sem permissive policies permanecem inacessíveis para usuários comuns.
- Sem alteração de contas, senhas, sessões, dados, grants de tabelas ou Cloudflare.
- **Não é MFA obrigatório**: usuários ainda não inscritos podem operar com o nível atual.

## Testes de integração exigidos
- Diretoria `aal1` com TOTP verificado: zero linhas nas consultas `gc_daily_reports`, `gc_monthly_goals`, `gc_teams` e `gc_memberships`; bloqueio nas operações de escrita (sem executar qualquer escrita real).
- Diretoria `aal2`: resultados anteriores visíveis e auditoria administrativa RPC funcional.
- Marcos `aal1` sem fator: acesso permitido aos mesmos registros já autorizados.
- Carla `aal1` da Empresa Parceira B: sem acesso à Empresa Piloto A.
- Ana `aal1`: apenas seus registros autorizados; não consegue acessar auditoria administrativa.
- Executar ensaio com `BEGIN`, `SET LOCAL ROLE authenticated`, `SET LOCAL request.jwt.claims`, `ROLLBACK` antes da migração; repetir após aplicação, sem gravar dados.
- Verificar Security Advisor e estado dos dados.

## Limite fora deste PR
A Edge Function `gc-invite-user` utiliza `service_role` para algumas operações: RLS não protege automaticamente esse uso. O envio de convites está condicionado às flags SMTP e a outras autorizações; a integração exige revisão isolada antes do uso real. Outras funções administrativas privadas já foram protegidas na v0.23.

**Nada de dados reais até auditoria integral e decisão de liberação.**
