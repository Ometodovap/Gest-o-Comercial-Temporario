# EPSA Gestão Comercial — prontidão de segurança para uso real

**Auditoria somente leitura em 15/11/2026.** Escopo exclusivo: GitHub `Ometodovap/Gest-o-Comercial-Temporario`, Supabase **Gestao Comercial Temporario** (`tilrqwcymhghmpvxukur`), Cloudflare Pages `gest-o-comercial-temporario`.

## Situação atual

**Decisão: HOMOLOGAÇÃO APROVADA PARA OS FLUXOS TESTADOS, NÃO LIBERAR DADOS REAIS.**

- v0.18: filtros individuais e comparativo mensal testados com Ana Martins, Marcos Pereira e Diretoria Piloto A; outubro/novembro fictícios.
- PR #14, commit `aab4e5c`: rótulo da diferença de conversão corrigido e publicado.
- PR #15, commit `15a5303`: revisão antecipada de feedback bloqueada na interface e no trigger de banco; deploy Cloudflare concluído.
- Tela de evolução da equipe conferida em 15/11: **Sondagem — Ana Martins** apresenta *Revisão agendada para 20/11/2026*, sem botão de conclusão; ausência de base numérica identificada corretamente.
- Teste transacional com `ROLLBACK` bloqueou revisão antecipada diretamente no banco; nenhuma revisão foi registrada, e dados de teste permanecem.
- Teste de RLS: Carla Souza (Empresa Parceira B) teve 0 fechamentos e 0 feedbacks da Empresa Piloto A; Ana visualizou seus dois fechamentos e o feedback próprio.

## Auditoria do Supabase (15/11/2026)

| Controle | Evidência | Situação |
| --- | --- | --- |
| Disponibilidade do projeto | `ACTIVE_HEALTHY` | OK |
| Tabelas `public.gc_*` | 17/17 com RLS | OK, requer testes contínuos de políticas |
| Leitura por `anon` | 0/17 tabelas com `SELECT` concedido | OK |
| Tabelas de auditoria | Sem `SELECT` para `authenticated` e sem policies de cliente | Proteção intencional, não abrir para esconder aviso |
| Views públicas | Nenhuma localizada | OK |
| Usuários Auth | 5 | Homologação |
| MFA verificado | **0 de 5** | **PENDENTE** |
| Vínculos privilegiados | 3 ativos (`manager`/`supervisor`) | Priorizar MFA |
| Proteção de senhas vazadas | Alerta do Security Advisor | **PENDENTE** |
| Plano Supabase | Free | Pro ou superior necessário para verificação nativa de senhas vazadas |

Avisos informativos do Security Advisor referentes a tabelas de auditoria sem policies não são razão para conceder acesso. Antes de desconsiderá-los, manter verificação de RLS e grants.

## Etapas para liberar operação real

1. **MFA/TOTP, sem bloqueio abrupto:** implementar fluxo de cadastro do autenticador, verificação, segundo fator ao entrar e recuperação operacional. Testar com contas fictícias, incluindo as três funções.
2. **Exigir MFA no servidor:** somente após a homologação do fluxo completo e adesão inicial, aplicar regra de `aal2` adequada ao escopo privilegiado no backend/RLS. Uma interface que pede MFA sem enforcement no servidor não é proteção suficiente.
3. **Senhas:** definir política mínima e tratamento de comprometimento. O verificador nativo de senhas vazadas exige plano Pro+; nenhuma mudança de assinatura/cobrança foi autorizada.
4. **Segurança funcional:** testar autorização de leitura, alteração, acesso entre empresas, inativação, troca de stand e ações administrativas em SQL transacional com `ROLLBACK`; preservar os registros existentes.
5. **Privacidade/LGPD:** definir controladores, operadores, finalidade, minimização, retenção e exclusão, acesso aos relatórios, resposta a incidente e documentação antes de dados reais.
6. **Go/no-go final:** CI verde, prévia Cloudflare validada, evidências de MFA, segurança e privacidade; só então autorizar migração de dados reais.

## Restrições

- Não alterar EPSA Core, GVS ou outros projetos Supabase.
- Não inventar resultados de testes; não cadastrar clientes reais durante homologação.
- Não ativar MFA compulsório nem trocar plano/cobrar sem etapa específica de aceite.
- Priorizar incrementos isolados em branch e PR com CI e Cloudflare Preview.

## Referências oficiais

- [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [Segurança de senhas](https://supabase.com/docs/guides/auth/password-security)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
