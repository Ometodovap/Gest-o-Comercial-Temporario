# EPSA Gestão Comercial v0.10 — Painel Gerencial Digital

## Objetivo
Dar a supervisores e direção uma visão operacional de oportunidades que exigem atenção. **Esta versão não cadastra dados de clientes e não dispara mensagens**; apenas calcula alertas sobre registros já autorizados no Supabase temporário.

## O que foi acrescentado
- Painel **Gestão digital da equipe**, dentro de Vendas digitais, disponível apenas para supervisor e direção na interface.
- Contadores de oportunidades em aberto, próximo contato vencido/hoje, oportunidades sem próxima ação e oportunidades sem movimentação **registrada no sistema**.
- Limite de ausência de movimentação configurável: **3, 7 (padrão) ou 14 dias**.
- Fila de até 10 oportunidades que exigem atenção e carteira por vendedor. Exibe o último registro, dias sem movimentação e critérios que acionaram cada alerta.
- A mesma oportunidade pode estar simultaneamente vencida e sem movimentação, por isso as contagens dos critérios **não são somadas** como número total de oportunidades.
- Acompanhamento de etapas e follow-ups existentes **não é modificado**.

## Definição da movimentação
Para cada oportunidade aberta, usa a mais recente entre:
1. Sua criação;
2. Um evento de mudança de etapa;
3. Um follow-up efetivamente registrado.

A diferença é medida em **dias civis do fuso America/Sao_Paulo**, não em horas exatas e não no fuso do navegador.

**Não mede o trabalho que ocorreu fora do sistema**, nem prova ausência de atendimento ou negligência de vendedor. Alteração de crédito/agenda sem registro de ação não conta como novo contato; isso é deliberado.

O painel não usa dados de outras empresas, porque todas as consultas usam as mesmas policies RLS já existentes. Limites atuais de exibição: 500 oportunidades e 5.000 registros de cada tipo; quando alcançados há aviso de que os indicadores podem estar incompletos.

## Banco de dados
**Nenhuma migração necessária.** Os indicadores derivam de tabelas existentes:
- gc_digital_opportunities
- gc_digital_stage_events
- gc_digital_followup_events

Não alterar bancos EPSA Core, GVS ou o projeto de homologação para testar a v0.10.

## Homologação
1. Em ambiente local, entrar como Marcos e abrir Vendas digitais.
2. Confirmar o painel **Gestão digital da equipe**, a carteira de Ana e a ausência de alerta falso quando a ação é futura e houve movimentação recente.
3. Mudar o seletor entre 3, 7 e 14 dias e verificar a classificação por dias civis.
4. Entrar como Ana e confirmar que o painel gerencial **não é exibido**.
5. Entrar como Carla e confirmar que a Empresa Parceira B não vê oportunidades de Ana.
6. Verificar que os resultados presenciais continuam intactos.
7. Conferir GitHub Actions (npm ci, audit, test, build) antes de considerar merge e publicação.

## Pendências de produção
O aplicativo continua em homologação com dados fictícios. Para dados reais, ainda é necessário endurecimento de Auth, LGPD, integridade da captação, tratamento de leads e indicadores consolidados com paginação no servidor.
