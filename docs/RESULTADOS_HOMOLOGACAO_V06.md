# Homologação EPSA Gestão Comercial v0.6 — 13/11/2026

Ambiente: Supabase `Gestao Comercial Temporario` (`tilrqwcymhghmpvxukur`). Não foram feitas mudanças nos projetos EPSA Core Platform ou GVS Imóveis.

## Migração aplicada

- `gc_monthly_goals_and_audit_v06`, conforme listado nas migrações do Supabase.
- Tabelas `public.gc_monthly_goals` e `public.gc_goal_audit` com RLS habilitado.
- Auditoria bloqueada para leitura por `authenticated` e `anon`.

## Testes de segurança em transações revertidas

- Marcos Pereira autenticado: inserção e atualização de metas de Ana Martins permitidas.
- Ana Martins autenticada: leitura de metas próprias permitida; tentativa de alteração retorna zero linhas atualizadas.
- Bia Oliveira e Carla Souza: zero metas de Ana visíveis, mesmo estando autenticadas.
- Carla: tentativa de atualizar meta de Ana retorna zero linhas.
- `seller_id` da meta não pode ser atualizado por `authenticated` (sem privilégio nessa coluna).
- Histórico de auditoria não pode ser consultado por `authenticated`.
- Todos os dados fictícios inseridos durante os testes foram revertidos por `ROLLBACK`.

## Resultado final do banco

- Zero metas gravadas e zero eventos de auditoria de metas.
- Lançamento de Ana Martins e feedback de Marcos Pereira preservados (um de cada).
- Avisos de segurança do Supabase: duas auditorias anteriores e `gc_goal_audit` sem policies diretas, intencional; proteção contra senhas vazadas desativada (revisar antes de uso real).

## Testes locais

- 29 testes de regras e de contratos da migração passaram com `npm test`.
- Análise sintática de `App.tsx`: zero erros.
- Verificação de tipos parcial com shims locais: sem erros; build real com npm ainda pendente neste ambiente por indisponibilidade do registro npm.

## Pendências antes de disponibilizar ao cliente

- Homologar o formulário Metas e desempenho no VS Code com login real.
- Testar build e interface no Windows e no celular.
- Migrar a consolidação para consultas paginadas ou RPC servidor-side em bases grandes, evitando limitação atual de até 1000 lançamentos.
- Rever o fluxo de autenticação e senhas, backups, LGPD e políticas de acesso antes de publicar em domínio de produção.
