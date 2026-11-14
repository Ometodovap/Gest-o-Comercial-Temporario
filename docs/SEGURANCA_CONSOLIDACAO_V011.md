# EPSA Gestão Comercial v0.11 — consolidação e segurança

**Ambiente:** piloto com dados fictícios. Supabase exclusivamente `tilrqwcymhghmpvxukur`, repositório `Ometodovap/Gest-o-Comercial-Temporario` e Cloudflare Pages. Nenhuma alteração nos bancos EPSA Core/GVS.

## Diagnóstico realizado em 14/11/2026

1. **RLS:** todas as 16 tabelas `public.gc_*` examinadas possuem Row Level Security habilitada. Não foram identificados privilégios diretos de SELECT/INSERT para `anon`.
2. **RLS multiempresa:** execução de leituras com o papel `authenticated` e identidades fictícias. Vendedor e supervisor da Empresa Piloto A acessaram 1 fechamento, 1 oportunidade, 2 follow-ups e 2 eventos de estágio. As duas contas da Empresa Parceira B visualizaram **0** desses registros. Consultas realizadas em transação revertida.
3. **Funções privadas:** funções `SECURITY DEFINER` de autorização ficam em `gc_private`, utilizam esquema de busca restrito e não são executáveis diretamente por `anon`; funções de auditoria internas não são executáveis pelo cliente.
4. **Auditorias:** `gc_feedback_audit`, `gc_report_audit`, `gc_goal_audit`, `gc_team_goal_audit`, `gc_digital_credit_audit` não têm políticas de leitura/escrita para usuários comuns, intencionalmente. O aviso `rls_enabled_no_policy` (INFO) **não deve ser eliminado com políticas abertas**.
5. **Auth:** aviso `auth_leaked_password_protection` (WARN): proteção contra senhas vazadas desativada. Segundo a [documentação oficial](https://supabase.com/docs/guides/auth/password-security), o recurso de bloqueio via HaveIBeenPwned está disponível no plano **Pro ou superior**. Não houve alteração de plano, cobrança nem de configuração Auth nesta etapa.
6. **Performance:** o Advisor identificou 21 chaves estrangeiras sem índices cobrindo suas colunas. É uma oportunidade de otimização, não uma autorização para criar índices indiscriminadamente; priorizar quando houver volume ou planos de execução representativos.
7. **Permissões padrão para novos objetos:** o projeto ainda possui defaults amplos de acesso no esquema `public` para novos objetos criados por `postgres` e `supabase_admin`. Isso não expôs as tabelas atuais porque nelas há RLS e concessões explícitas, mas é um risco operacional de futuras migrações. Planejar uma alteração controlada de *default privileges* antes de criar novas tabelas e sempre aplicar RLS/GRANT na mesma transação.

## Correções versionadas nesta branch

- **Proteção do escopo no navegador:** cada resposta das consultas de dados é vinculada à combinação de usuário autenticado, empresa e mês. Respostas de requisições antigas não sobrescrevem o estado da sessão atual. A interface não mostra dados antes da carga autorizada para aquele escopo.
- **Troca de empresa e logout:** invalidam requisições em curso imediatamente; revoga-se o escopo visual antes da conclusão do logout.
- **Renovação do token da mesma conta:** não causa perda indevida do estado visível.
- **Cabeçalhos de proteção Cloudflare:** arquivo `public/_headers` com `nosniff`, proteção contra incorporação em frames, diretrizes CSP de restrição de origem de frames/base/objetos, `Referrer-Policy` e política de permissões para câmera/microfone/geolocalização. *Não substituem autenticação/RLS.*
- **Testes automáticos:** abrangem trocas de sessão, empresa, mês, respostas assíncronas antigas, chave pública Supabase e presença dos cabeçalhos.
- **Não houve alteração no esquema nem nos registros do Supabase**, e não se mexeu na política de usuários existentes.

## Critérios para homologação v0.11

1. GitHub Actions: `npm ci`, `npm audit --audit-level=high`, `npm test`, `npm run build`.
2. Login como Ana e como Marcos com as contas fictícias; **Meu dia**, **Vendas digitais**, **Metas** e **Gestão digital da equipe** devem continuar funcionando.
3. Trocar usuários via logout/login e validar ausência de dados de outro usuário durante o carregamento.
4. Se existirem duas associações ativas para um usuário, alternar empresas e conferir que os painéis nunca exibem registros da associação anterior.
5. Conferir cabeçalhos na publicação de preview da Cloudflare antes do merge. Este arquivo vale para respostas estáticas no Pages; Pages Functions têm regras próprias.
6. Repetir o Security Advisor. **Não considerar o piloto liberado para clientes reais** se o aviso de proteção de senhas e as demais tarefas de go-live ainda estiverem pendentes.

## Checklist obrigatório para entrar em produção real

- Estabelecer base legal, responsabilidades dos controladores e operadores, finalidade, retenção, acesso e exclusão LGPD. Não reaproveitar simplesmente a mesma base temporária.
- Definir autenticação forte: senha longa, política de complexidade, proteção contra senhas comprometidas quando o plano permitir, MFA e procedimentos de revogação de acesso.
- Revisar permissões de administradores, vínculo com empresas, RLS de todos os campos/objetos e testes reais de revogação de associação enquanto sessão permanece válida.
- Revisar *default privileges* no esquema público e novos índices com migração atômica controlada.
- Prover monitoramento, recuperação de incidentes, backups/restore testados, retenção de eventos e paginação/relatórios completos para operação em escala.
- Só migrar dados de clientes com integração MCI/CRM revisada, sem misturar GVS e EPSA Core.

**Status:** correções de navegador e headers prontas para homologação técnica e visual, sem autorização para o uso real de dados de clientes.
