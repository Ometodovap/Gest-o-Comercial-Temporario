# Revisão de feedback: prazo e avaliação qualitativa (homologação)

Escopo: somente EPSA Gestão Comercial, banco Supabase **Gestão Comercial Temporário**. Não alterar EPSA Core/GVS, nem utilizar clientes reais.

## Regras
- Revisão só pode ser registrada na data `review_date` ou depois, em **America/Sao_Paulo**. O guard do banco impede antecipação mesmo por chamada direta à API.
- O vendedor pode confirmar leitura antes da data, independentemente da revisão gerencial.
- Conversão antes/depois só é comparável com **três dias distintos de fechamentos enviados/validados em cada janela** e base de atendimentos válida; não se deve inferir melhora a partir de registros insuficientes.
- Após a data de revisão, se faltar base quantitativa, uma avaliação **qualitativa** é permitida desde que o responsável escreva observações. O frontend exige justificativa; essa exigência de notas não é garantia de banco e deve ser considerada em futuras revisões de regras.
- A revisão permanece única; funções, RLS e auditoria anteriores seguem em operação.

## Cenários para testar
1. Entrar como Diretoria Piloto A, abrir **Evolução da equipe** antes de 20/11/2026: o feedback de sondagem de Ana Martins mostra **Revisão agendada para 20/11/2026** sem formulário de conclusão.
2. Na data ou depois, permitir avaliação; como só existe um dia válido de fechamento em novembro/2026, exigir observações e apresentar **Avaliação qualitativa**; não inventar melhora quantitativa.
3. Como Ana Martins, conferir leitura das orientações e ausência do formulário da Diretoria.
4. Registrar revisão somente em data autorizada e verificar auditoria; não alterar feedback real durante homologação.
5. Confirmar via testes automatizados que a decisão de prazo e justificativa funciona na camada de interface; testar restrição de banco transacionalmente, preservando os dados.

## Limites
- Sistema de homologação com dados fictícios.
- Os avisos do Security Advisor, políticas de MFA e outros requisitos de operação com clientes reais permanecem pendentes.

## Verificação executada em 15/11/2026

- Migração do banco de homologação registrada como **20261115203335_gc_feedback_review_due_guard_v018**; SQL versionado em `supabase/migrations/20261115203335_gc_feedback_review_due_guard_v018.sql`. Não reexecutar manualmente.
- Leitura da função confirmou `SECURITY INVOKER` e `search_path` vazio, preservando demais regras do trigger existente.
- Teste transacional, como supervisor Marcos Pereira, tentou registrar revisão antes de 20/11/2026: **bloqueado** com a mensagem esperada; `ROLLBACK` executado.
- Teste de RLS como Carla Souza (Empresa Parceira B) retornou zero fechamentos e zero feedbacks da Empresa Piloto A; Ana Martins visualizou seus dois fechamentos e o próprio feedback.
- GitHub Actions: CI com `npm ci`, `npm audit --audit-level=high`, `npm test` e `npm run build` aprovado na branch; Cloudflare Preview com deploy bem-sucedido.
