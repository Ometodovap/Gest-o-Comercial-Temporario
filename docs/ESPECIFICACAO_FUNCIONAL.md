# EPSA Gestão Comercial — Especificação funcional inicial (v0.1)

**Data:** 13/11/2026  
**Situação:** documento de planejamento; nenhum módulo, tabela ou regra foi publicado em produção.  
**Origem:** planilha `PROCESSOS DE VENDAS E ACOMPANHAMENTOS DE ATENDIMENTOS -MATRIZ.xlsx` e decisões desta conversa.  
**Produto:** aplicativo independente, multiempresa, preparado para futura integração ao EPSA Core.  
**Princípio do produto:** o vendedor registra sua atividade ao fim do dia; o sistema calcula indicadores; o supervisor dá feedback específico; a equipe acompanha a evolução.

## 1. Escopo e objetivos

1. Substituir o preenchimento manual dos consolidadores em Excel por lançamentos diários auditáveis.
2. Viabilizar acompanhamento de produtividade, conversão e atingimento de metas por vendedor, equipe, stand e empresa.
3. Dar ao supervisor um processo sistemático para identificar causas de baixo desempenho, registrar orientações e avaliar a evolução.
4. Atender dois segmentos: **Presencial (stands e shopping)** e **Digital (prospecção e funil de vendas)**, com métricas adequadas a cada modalidade.
5. Operar com várias empresas parceiras sem compartilhamento de dados entre elas.

### Fontes e limites da planilha

O arquivo tem abas `G.RIO`, `MATRIZ`, `MATRIZ 1`, `MATRIZ 2`, `MATRIZ 3`, `TMKT`, `GERAL` e `Plan1`. Contém dimensões como atendimentos, prospecções, ligações, visitas, cotas, inadimplência, valor e dias trabalhados. Parte das fórmulas retorna erros `#DIV/0!`, e a aba GERAL aponta um mês de referência antigo. Por isso **a planilha é referência metodológica, não um modelo técnico a copiar literalmente**.

## 2. Papéis e permissões

| Perfil | Ações permitidas na primeira versão |
|---|---|
| Vendedor | Lançar, consultar e corrigir com justificativa suas próprias atividades; consultar metas e feedbacks; confirmar leitura do feedback |
| Supervisor | Visualizar equipe vinculada; avaliar registros; consultar painel por vendedor e stand; registrar feedback, ações e revisão |
| Gestor/diretoria da empresa | Consultar a própria empresa, comparar equipes, definir metas, cadastrar unidades/equipes, acompanhar feedbacks |
| Administrador da plataforma | Gerenciar habilitação do produto, parâmetros e suporte com acesso restrito e auditável; sem exposição indiscriminada de dados de clientes |

**Regra de acesso:** todas as entidades de negócio devem estar associadas à empresa (`company_id`). As políticas do banco devem impor isolamento real por empresa, além de regras de equipe e usuário; esconder menus no frontend não basta.

## 3. Jornada do vendedor presencial

**Identificação preenchida pelo sistema:** usuário, empresa, stand/unidade, data e turno (caso aplicável).

**Campos do lançamento diário (mínimo viável):**

| Campo | Tipo | Definição |
|---|---|---|
| Novos atendimentos | Inteiro ≥0, obrigatório | Pessoas efetivamente abordadas e atendidas pela primeira vez no contexto daquela oportunidade. Não conta simples cumprimento nem retorno de cliente já atendido. |
| Vendas imediatas — clientes | Inteiro ≥0, obrigatório | Quantidade de clientes dos novos atendimentos do dia que fecharam no próprio atendimento; não quantidade de cotas. |
| Agendamentos feitos | Inteiro ≥0, obrigatório | Novos compromissos para continuar negociação, provenientes dos atendimentos; um agendamento não é uma venda. |
| Retornos efetivamente realizados | Inteiro ≥0, obrigatório | Contatos ou comparecimentos de clientes já atendidos anteriormente que foram de fato realizados no dia. Não contar somente os prometidos. |
| Vendas provenientes de retornos — clientes | Inteiro ≥0, obrigatório | Clientes que fecharam no dia por meio de retorno, separados dos fechamentos imediatos. |
| Cotas comercializadas | Inteiro ≥0 | Quantidade de cotas/contratos vendidos; pode ser superior à quantidade de clientes compradores. |
| Valor total dos créditos comercializados | Decimal monetário ≥0 | Somatório dos valores de crédito das cotas vendidas, para calcular produção; não confundir com comissões nem faturamento reconhecido. |
| Observações do vendedor | Texto breve, opcional | Obstáculos, oportunidades, motivos de retornos ou situações que o supervisor deva conhecer; evitar dados pessoais desnecessários. |
| Status do dia | Aberto / enviado / validado / devolvido para correção | Distingue ausência de lançamento de dia com resultado zero. |

**Regras de negócio:**

- `vendas_imediatas_clientes <= novos_atendimentos`.
- `vendas_retorno_clientes <= retornos_realizados` como regra geral; situações excepcionais devem ter uma categoria explícita, não lançar valores inconsistentes.
- `cotas_comercializadas >= vendas_imediatas_clientes + vendas_retorno_clientes` quando toda venda é representada por ao menos uma cota; divergências entre vendas declaradas e vendas verificadas deverão ser reconciliadas.
- Não permitir negativos, frações em contagens nem lançamentos duplicados para a mesma combinação de vendedor, unidade, data e turno.
- Permitir correções autorizadas com histórico completo (quem, quando, antes/depois, justificativa).
- Diferenciar dia sem expediente, dia trabalhado sem atividade (zeros informados) e dia trabalhado sem envio (pendente).
- Não contabilizar retornos como novos atendimentos para evitar duplicidade no denominador da conversão.
- Agendamentos e retornos podem ser vinculados a registros mínimos de clientes para permitir acompanhamento, com consentimento/base legal adequada e retenção definida. Na primeira versão, o formulário diário pode operar por totais; a agenda nominal é recurso a ser habilitado separadamente.

### Métricas presencial

- **Conversão imediata (%):** `clientes que compraram no primeiro atendimento / novos atendimentos × 100` (se denominador zero, exibir `—` e não zero ou erro).
- **Vendas provenientes de retornos:** contagem separada, atribuída ao dia do fechamento e ao atendimento original quando houver vínculo.
- **Produção em créditos (R$):** soma do valor das cotas confirmadas; não multiplicar indiscriminadamente por tíquete médio quando houver valores efetivos.
- **Cotas por dia trabalhado:** cotas confirmadas / dias efetivamente trabalhados.
- **Meta atingida (%):** realizado / meta; se meta não cadastrada, exibir `não definida`.
- **Conversão final por origem:** requer relacionamento entre clientes/oportunidades e atendimento inicial; não calcular como `vendas totais de hoje / atendimentos novos de hoje` porque vende-se também a clientes de dias anteriores.

### Experiência de uso do vendedor

1. Entrar no app, localizar `Meu dia`, verificar stand/turno.
2. Informar valores por controles simples e legíveis no celular (preferencialmente em menos de um minuto quando não há anotações).
3. Conferir o resumo e enviar o fechamento; aceitar zero quando não houve atividade, desde que seja uma declaração explícita.
4. Ver imediatamente métricas e metas; consultar orientações recebidas.
5. Retornar posteriormente para justificar eventual correção; versões anteriores permanecem rastreáveis.

## 4. Jornada do vendedor digital

O digital usa um funil, não o formulário presencial. Etapas inicialmente propostas: `novo lead/prospecção -> contato estabelecido -> qualificado -> proposta/simulação -> negociação/retorno -> venda`, mais estados de perda/inatividade. Agendamento e follow-up devem ser atividades vinculadas à oportunidade.

**Regra de ouro:** se um contato/proposta/venda já estiver registrado no CRM EPSA ou MCI Consórcio, evitar exigir um segundo lançamento manual: integrar eventos ou importar registros validados quando houver integração segura. No MVP isolado, um resumo diário pode suprir a lacuna até o funil operacional estar pronto.

**Indicadores digitais:** leads novos, tentativas e contatos efetivos, qualificados, propostas, follow-ups no prazo/atrasados, clientes compradores, cotas, volume de créditos, conversão por etapa e por origem.

## 5. Processo de acompanhamento e feedback

**Painel do supervisor:**

- Situação dos lançamentos do dia: enviado, pendente, devolvido, folga.
- Por vendedor: atendimentos, conversão imediata, vendas retorno, cotas, R$ de créditos, meta, médias móveis, evolução semanal e mensal.
- Por equipe/stand: soma de produção, tendência e comparação com suas próprias metas e histórico, sem usar benchmarks não validados.
- Filtros por período, modalidade, equipe, unidade e vendedor.

**Sugestões automáticas, sempre configuráveis e revisadas pelo supervisor:**

| Evidência | Hipótese de diagnóstico | Exemplo de feedback |
|---|---|---|
| Volume abaixo da meta, conversão estável | Poucas oportunidades trabalhadas | “Aumentar a consistência das abordagens e revisar horários de maior movimento” |
| Volume conforme meta, conversão abaixo da referência da própria equipe | Dificuldade em conduzir atendimento | “Observar uma abordagem e praticar sondagem e apresentação de valor” |
| Muitos agendamentos, poucos retornos realizados | Falha no compromisso/seguimento | “Confirmar agenda e acompanhar o comparecimento” |
| Evolução consistente de volume e conversão | Prática positiva a reconhecer | “Reforçar o comportamento e compartilhar a técnica com a equipe” |

**Feedback documentado:** vendedor, supervisor, período analisado, indicador observado, diagnóstico humano, orientação objetiva, ação combinada, data de revisão, confirmação de leitura e avaliação posterior do efeito. O aplicativo **recomenda**, mas não determina punições, classificações pessoais ou decisões trabalhistas automaticamente.

## 6. Telas da primeira versão

| Tela | Vendedor | Supervisor | Diretoria |
|---|---|---|---|
| Meu dia / lançar resultados | Criar e enviar | Visualizar equipe | Consultar |
| Meus resultados e metas | Próprios dados | Equipe | Empresa |
| Pendências de fechamento | Próprias | Equipe | Indicador consolidado |
| Feedback e plano de melhoria | Receber, confirmar leitura | Criar, acompanhar | Consultar indicadores de gestão |
| Painel de produtividade | Próprios dados | Vendedor/equipe/stand | Empresa/equipes/modalidades |
| Cadastro de metas/unidades/usuários | — | Limitado por permissão | Administrar |

## 7. Modelo de dados conceitual (sem migrações executadas)

- `companies`: empresas parceiras.
- `users` + `company_memberships`: identidade e papéis por empresa.
- `teams` e `units`: equipes, stands e operações digitais vinculados a empresa.
- `team_assignments`: vínculo histórico de vendedor/supervisor/unidade com vigência.
- `work_schedules` / `work_days`: dias e turnos previstos/trabalhados.
- `sales_targets`: metas por período, modalidade e nível, com versionamento.
- `daily_activity_reports`: lançamento diário e campos de produção, com origem e status.
- `daily_activity_audit`: histórico de edições e validações.
- `sales_records`: vendas reais/cotas/valores, idealmente de origem auditável e associáveis a CRM; separar situação informada de confirmada.
- `appointments`: compromissos e retornos, quando habilitado o módulo nominal.
- `coaching_feedback`: feedbacks, ações acordadas, prazo e avaliação.
- `sales_funnel_events`: movimentações do canal digital, manual ou integradas.
- `product_entitlements`: direito de cada empresa utilizar o módulo, para integração futura ao EPSA Core.

**Arquitetura preliminar:** frontend web responsivo React/TypeScript; Supabase com autenticação, policies RLS e migrations versionadas; Vercel para preview e deploy. O repositório pode ser independente; a integração com EPSA Core deve usar contrato de identidade/acesso especificado após auditoria dos módulos existentes. **Não compartilhar indiscriminadamente tabelas ou autenticação com uma instalação existente antes da análise de segurança.**

## 8. Critérios de aceite do primeiro incremento

1. Vendedor consegue preencher seu dia e enviar, inclusive com resultados zero declarados.
2. Supervisor vê lançamentos e pendências apenas de sua equipe.
3. Diretoria vê dados agregados apenas da sua empresa.
4. Metas e indicadores são calculados a partir de dados persistidos, sem divisões por zero e sem fórmulas de planilha.
5. Vendas imediatas e de retorno não são confundidas; clientes compradores e quantidade de cotas são entidades distintas.
6. Feedback é registrado, visto pelo vendedor e ligado a ação com data de revisão.
7. Ajustes ficam auditados; não há registros silenciosamente sobrescritos.
8. Testes comprovam bloqueio de acesso cruzado entre duas empresas.
9. A ausência de lançamento não aparece como desempenho igual a zero.
10. Nenhuma funcionalidade modifica o EPSA Core em produção antes de homologação e autorização de integração.

## 9. Roteiro sugerido de implementação

1. **Levantamento:** validar glossário, regras do stand e cadastro de metas; mapear campos da planilha para o modelo de dados.
2. **Base multiempresa:** autenticação, perfis, isolamento, cadastros de empresa/equipe/stand e metas.
3. **MVP presencial:** formulário diário, validações, cálculo de indicadores, envio e correção auditável.
4. **Gestão:** painel do supervisor, alertas de pendência, feedback e plano de ação.
5. **Homologação:** empresa piloto, dados de teste, conferência de totais, testes de permissões e experiência no celular.
6. **Digital:** funil e eventos, preparando integração com CRM/MCI.
7. **Integração EPSA Core:** habilitação do módulo por empresa, identidade e navegação compartilhadas mediante contrato, migração e revisão de segurança.

## 10. Pontos abertos para validar com a operação

- Empresa piloto (não escolhida ainda).
- Se cada vendedor trabalhará em um ou mais stands no mesmo dia e se há turnos com dois fechamentos.
- Qual evento valida uma venda para os indicadores oficiais (proposta assinada, 1ª parcela recebida ou confirmação da administradora).
- Quem cadastra e aprova metas e qual a regra de dias úteis/trabalhados.
- Qual dado mínimo pode ser mantido em agendamentos para permitir retornos, considerando LGPD e governança EPSA/GVS.
- No digital, quais atividades já são capturadas pelo MCI Consórcio/CRM e quais exigirão registro manual na primeira versão.

---

**Próxima entrega planejada:** estrutura de banco e protótipo navegável do formulário `Meu dia` + visão do supervisor, após validação do glossário e dos critérios de contagem. Nenhum recurso está publicado neste momento.
