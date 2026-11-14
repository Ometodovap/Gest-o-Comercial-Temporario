# EPSA Gestão Comercial v0.8 — funil digital piloto

**Ambiente de homologação independente**, conectado somente ao Supabase **Gestao Comercial Temporario** (`tilrqwcymhghmpvxukur`). Não use dados reais de clientes nesta fase. O EPSA Core e a GVS não são alterados por este projeto.

## Novidades da v0.8 — piloto do funil digital

- Menu **Vendas digitais** com cadastro de oportunidades *sem dados pessoais de clientes*, etapas de prospecção até ganho/perda, próxima ação e motivo de perda.
- Indicadores por etapa e conversão das oportunidades cadastradas no painel (não é conversão de uma coorte de leads reais).
- Controles por vendedor, supervisor e empresa, auditoria privada de mudanças de etapa, e proibição de alteração da identidade/origem.
- Somente projeto Supabase de homologação. Migrações `gc_digital_pipeline_stage_v08` e `gc_digital_terminal_lock_v08a` já aplicadas nele. **Não reaplicar no mesmo projeto nem em EPSA Core/GVS**.
- A modalidade presencial v0.7 permanece intacta. *Dados pessoais e integração CRM/MCI ainda não estão habilitados.*
- Testes novos em `tests/digital-pipeline-v08.test.cjs`; executar `npm test` e `npm run build` antes de publicar.

## Novidades da v0.7 (branch anterior)

- Menu **Produtividade por stand** para supervisão/diretoria, com comparativo por stand e ranking dos vendedores autorizados.
- Metas mensais **independentes por stand/equipe**, complementares às metas individuais existentes.
- Cálculos por `team_id` registrado no fechamento (transferências futuras de vendedor não alteram o passado); somente enviados/validados entram nos indicadores.
- `gc_team_monthly_goals` + auditoria no Supabase **temporário**, com RLS: supervisor gerencia sua equipe; vendedor apenas consulta; outra empresa não acessa.
- Estrutura e testes do **funil digital** em `src/digitalPipeline.ts`, com especificação em `docs/FUNIL_DIGITAL_V07_DESENHO.md`. **Ainda sem captação de leads, formulários de clientes nem mudanças no CRM.**
- Testes locais de funções comerciais: 36 aprovados; testes transacionais de permissões no Supabase temporário: aprovados. **Build completo React/Vite pendente de validação em ambiente com npm**.
- A branch `main` e a publicação atual da Cloudflare Pages ficam intactas até revisão e merge.

### Aplicar a v0.7

A migração `supabase/TEAM_GOALS_MIGRATION_DEV_v07.sql` **já foi aplicada** no projeto Supabase temporário `tilrqwcymhghmpvxukur` e não deve ser executada novamente nesse projeto. Não execute no EPSA Core ou na GVS.
Para teste de código, troque para a branch de v0.7 no VS Code, preserve o seu `.env`, execute `npm install`, `npm test` e `npm run build`.

---

## O que mudou na v0.6

- Menu **Minhas metas**, para vendedores, e **Metas e desempenho**, para supervisores/diretoria.
- Metas **mensais e individuais** de atendimentos, clientes compradores, cotas e valor de créditos.
- Supervisores podem cadastrar ou alterar apenas metas de vendedores sob sua responsabilidade (RLS no banco).
- Vendedor vê metas e realizado, sem permissão de alteração.
- Visão consolidada por equipe e empresa, com cobertura das metas definidas e comparação entre vendedores autorizados.
- Relatório mensal, evolução diária de atendimentos e visão de lançamentos pendentes.
- Conversão imediata usa **vendas imediatas / novos atendimentos**. Vendas por retorno entram no total de clientes compradores, mas não inflam a conversão imediata.
- Metas inexistentes não são confundidas com produtividade zero. Lançamentos em rascunho ou devolvidos não compõem os resultados.
- O sistema já existente de fechamento, validação e feedback permanece intacto.

## Banco Supabase

A migração **`gc_monthly_goals_and_audit_v06`** foi aplicada somente ao projeto de homologação em 13/11/2026. **NÃO execute novamente** o SQL do arquivo `supabase/GOALS_MIGRATION_DEV_v06.sql` nesse projeto.

Foram acrescentadas duas tabelas:

1. `gc_monthly_goals`: metas por vendedor, empresa e mês, RLS ativo.
2. `gc_goal_audit`: histórico de inclusões/alterações, sem leitura/escrita direta por usuários comuns.

Testes de RLS executados em transações revertidas:
- Marcos (supervisor) define e atualiza metas de Ana.
- Ana visualiza suas metas, mas não altera.
- Bia e Carla, da segunda empresa, não visualizam nem modificam as metas de Ana.
- Alterar vínculo da meta para outro vendedor é bloqueado por permissão de coluna.
- Trilha de auditoria não é legível por `authenticated`.

**Não foi cadastrada nenhuma meta de teste no banco**. Defina metas fictícias pela interface do supervisor.

## Como iniciar no VS Code (Windows)

1. Extraia o ZIP em uma pasta nova, por exemplo `epsa-gestao-comercial-v0_6`, e abra essa pasta no VS Code.
2. Copie o `.env` da versão anterior **ou** crie a partir de `.env.example`. O exemplo contém somente o endpoint e a chave **publicável** do projeto temporário, nunca chave administrativa.
3. Abra o terminal do VS Code e execute:

```powershell
Copy-Item .env.example .env
npm install
npm run test
npm run build
npm run dev
```

Se você copiou um `.env` da versão anterior, **não execute** o primeiro comando acima (ele sobrescreveria o arquivo). No Windows, `npm install` requer acesso à internet e cria `package-lock.json`.

4. Acesse `http://localhost:5173` (ou o endereço exibido pelo Vite).
5. Entre como **Marcos Pereira** (`marcos@piloto.test`) com a senha que você definiu no Supabase, vá a **Metas e desempenho**, selecione novembro de 2026 e Ana Martins. Cadastre metas **fictícias** (por exemplo, 200 atendimentos, 40 compradores, 45 cotas, R$ 1.200.000 em créditos).
6. Confira que as metas foram salvas. Entre como **Ana Martins** e abra **Minhas metas**. O realizado deve incluir o fechamento de 13/11 (20 atendimentos, 5 clientes compradores, 6 cotas, R$ 480.000, conversão imediata de 20%).
7. Entre como **Carla Souza** e confirme que a meta de Ana não é visível. Não cadastre dados reais.

> **Não é necessário executar SQL manualmente**. As tabelas e as políticas de acesso já foram criadas.

## Testes e limitações

- `npm test` passou: 29 testes de domínio/indicadores e contratos do esquema, incluindo oito novos testes de metas e políticas.
- Foi feita inspeção sintática do TSX e verificação estática de tipos com declarações simplificadas; **a compilação final com dependências reais continua pendente**, porque o registro npm ficou indisponível no ambiente de geração.
- A aplicação atual carrega no máximo 1.000 lançamentos e 500 feedbacks; substituir por consultas paginadas/agregação no servidor antes de escalar para várias equipes com histórico grande.
- Metas são mensais, por vendedor. Futuramente serão adicionadas metas por stand e planejamento de dias trabalhados; somar metas ausentes não equivale a meta de equipe completa.
- Um registro enviado e ainda não validado já conta no realizado provisório. Uma visão definitiva deverá separar indicadores validados e provisórios.
- Este módulo ainda não está publicado na Vercel e não está integrado ao login central do EPSA Core.
- O projeto Supabase ainda emite aviso para proteção de senhas vazadas desativada; revisar antes de uso real.
- Para publicação online, configurar ambiente Vercel com as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, verificar URL de redirecionamento Auth e executar os testes com navegadores/celulares diferentes.

## Organização dos arquivos

- `src/App.tsx` — interface React e navegação.
- `src/goals.ts` — regras puras de metas, consolidação e série diária.
- `src/metrics.ts` — regras de conversão e avaliação anteriores.
- `supabase/GOALS_MIGRATION_DEV_v06.sql` — arquivo de referência da migração já aplicada.
- `tests/goals.test.cjs` — seis testes de metas.

**Próximo marco:** homologação da interface de metas, publicação em ambiente Vercel de teste e posterior módulo de operação digital.
