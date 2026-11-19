# Homologação v0.23 — guarda MFA nas operações administrativas (Supabase temporário)

Escopo: `Gestao Comercial Temporario` (`tilrqwcymhghmpvxukur`), GitHub `Ometodovap/Gest-o-Comercial-Temporario`. Não modificar GVS, EPSA Core ou usar clientes reais.

## Situação de partida (19/11/2026)
- Diretoria Piloto A: **1 fator TOTP verificado** e fluxo de login `aal2` já homologado.
- Marcos Pereira e Carla Souza: **sem fator verificado**.
- Seis RPCs administrativas públicas chamam implementações privadas `SECURITY DEFINER`: empresas (criar, renomear), pessoas, stands, lotação de vendedores e leitura da auditoria.
- No estado anterior, a Diretoria consegue consultar `gc_admin_event_feed` com `aal1`. Acesso de vendedor à auditoria e alteração de registro de outra empresa já foram negados em testes anteriores.

## Mudança proposta
Cada uma das **seis funções privadas** passa a verificar, antes da lógica administrativa existente, se `auth.uid()` já possui um fator TOTP com status `verified`. Se possuir, a função exige `auth.jwt()->>'aal'='aal2'`; sem isso, retorna erro Postgres `42501`.

Isso é **enforcement seletivo para quem já cadastrou MFA**, sem exigir novos cadastros nem bloquear supervisores sem TOTP. A autorização original por empresa e função continua em vigor.

SQL em `docs/sql/gc_admin_mfa_condicional_v023.sql` (fonte das definições atuais do banco). Não adicionar grants/novas rotas públicas, não alterar RLS ou dados.

## Homologação do banco antes de publicar
1. Executar CI do PR com os testes de que **todas as seis funções** receberam a regra e mantiveram `SECURITY DEFINER` e `search_path`.
2. Aplicar a migração no **Supabase Gestão Comercial Temporário**; versionar a revisão com o número efetivamente atribuído pelo Supabase.
3. Em **transações com ROLLBACK**, simular JWT de Diretoria com `aal1` e confirmar bloqueio da leitura da auditoria e de operações administrativas; `aal2` deve permitir a leitura normal e preservar a validação existente em operações com parâmetros inválidos.
4. Em sessão simulada de Marcos e Carla `aal1` sem fator, não introduzir rejeição por MFA. Para esses perfis, a autorização anterior continua sendo aplicada (operações exclusivas da Diretoria continuam negadas).
5. Vendedor ou usuário de outra empresa continua sem acesso à auditoria; nenhum registro fictício deve ser alterado.
6. Confirmar no GitHub e Supabase o mesmo corpo de SQL e auditorias intactas.

## Limites
**Esta não é a proteção completa do banco.** Tabelas comerciais ainda aplicam as políticas RLS atuais; operações de metas, feedbacks e o endpoint `gc-invite-user` exigem avaliação separada antes de dados reais. A ausência de fator verificado ainda permite as operações antigas: esse é um rollout voluntário deliberado para não interromper o piloto.

**Não habilitar MFA compulsório para supervisores nesta fase.** O endereço comercial da Diretoria e o TOTP já foram homologados. A recuperação de senha por Gmail e a revisão LGPD continuam pendentes de teste final.

## Rollback
Restaurar as definições das seis funções antes do guard usando as migrations existentes ou definições históricas verificadas; preferir migration reversa auditada, não alterar funções manualmente nem mexer em fatores de usuários.
