# EPSA Gestão Comercial v0.8 — funil digital piloto

## Estado
Branch **feat/gestao-comercial-v08-funil-digital-piloto**, sem merge automático. A versão v0.7 presencial permanece em produção na Cloudflare Pages.

## Objetivo
Uma oportunidade digital fictícia pode ser cadastrada com origem, produto, responsável, equipe, crédito estimado (opcional) e data da próxima ação, sendo acompanhada pelos estados:
**prospecção → contato → qualificação → proposta → negociação → ganha/perdida**.

Os indicadores digitais não alimentam os indicadores presenciais automaticamente. A conversão apresentada é \`oportunidades ganhas ÷ oportunidades visíveis cadastradas\`, e não uma taxa validada de campanhas externas nem uma coorte temporal.

## Dados e segurança
- Não há campos para nome, e-mail, telefone, CPF, observações livres ou identificação pessoal do cliente. Identificador da oportunidade é UUID gerado pelo banco.
- Autenticação Supabase e RLS por empresa, vendedor e supervisão; a direção pode acompanhar vendedores autorizados dentro da empresa.
- Origem, produto, empresa, equipe e vendedor são imutáveis. Oportunidades ganhas/perdidas não podem ser alteradas nem reabertas.
- Mudanças de etapa geram eventos internos auditáveis; somente o banco pode gravar esses eventos.
- Sem permissão de DELETE para o usuário do navegador; \`anon\` sem acesso aos registros.
- Nenhum dado real de cliente até revisão LGPD e integração adequada ao CRM EPSA/MCI. Não confundir com integração de campanhas Google Ads.

## Supabase de desenvolvimento
Projeto \`tilrqwcymhghmpvxukur\`, exclusivamente.
Migrações já aplicadas:
- \`gc_digital_pipeline_stage_v08\`: criação do funil e eventos
- \`gc_digital_terminal_lock_v08a\`: congelamento definitivo de oportunidades encerradas

**Não reaplicar no mesmo projeto nem executar nas bases EPSA Core/GVS.**

## Homologação sugerida
1. Entrar como Ana Martins. Ir a **Vendas digitais** e cadastrar uma oportunidade fictícia.
2. Avançar da prospecção para contato, qualificação, proposta e negociação; registrar próxima ação.
3. Abrir **Ver histórico de etapas** no cartão e confirmar a ordem dos eventos, o usuário e a data.
4. Concluir como ganha ou perdida com motivo e confirmar que não é possível reabrir.
5. Entrar como Marcos. Confirmar visualização das oportunidades da equipe.
6. Entrar como Bia ou Carla. Confirmar ausência dos dados da Empresa Piloto A.
7. Conferir se os indicadores presenciais permaneceram sem alteração.

## Expansão posterior
Ligações reais com MCI/CRM, deduplicação de leads, consentimento e retenção, múltiplos responsáveis, integrações de origem e follow-up mais elaborado serão desenvolvidos após homologação e auditoria específica. A v0.8 ainda é piloto com dados fictícios.
