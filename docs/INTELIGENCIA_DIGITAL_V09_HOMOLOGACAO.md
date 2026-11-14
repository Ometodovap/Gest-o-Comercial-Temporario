# EPSA Gestão Comercial v0.9 — Inteligência e Produtividade Digital

## Situação

Desenvolvimento em branch isolada `feat/gestao-comercial-v09-inteligencia-digital`, em homologação. A versão 0.8 na Cloudflare Pages e a branch `main` **não são alteradas** antes de aprovação.

## Entregas

- **Agenda de follow-ups:** vencidos, para hoje, futuros, sem próxima ação, com priorização. A situação é calculada no fuso de Brasília.
- **Registro de atividade comercial:** contato realizado, tentativa sem resposta ou reagendamento, com atualização atômica da próxima ação no Supabase.
- **Produtividade por vendedor:** oportunidades atribuídas, etapas alcançadas, propostas, vendas, perdas, contatos efetivamente registrados pelo próprio vendedor e tentativas sem resposta.
- **Motivos de perda:** consolidação dos códigos de motivo, sem supor comportamento do cliente.
- **Correção do crédito estimado:** edição do valor durante oportunidade aberta; audita os valores anterior e novo, autor e momento numa tabela privada.
- **Histórico de etapas v0.8** preservado. Registro de atividade e mudança de etapa são eventos diferentes.

## Critérios de cálculo

- O funil apresenta a **etapa atual** de cada oportunidade, não soma todos os estágios já percorridos.
- O relatório por vendedor conta cada **etapa alcançada no máximo uma vez por oportunidade**, desde que haja evento correspondente; não presume etapas puladas.
- A taxa de conversão é **oportunidades ganhas / oportunidades visíveis**, não uma taxa de leads captados por campanhas nem resultado financeiro.
- Contatos registrados de cada vendedor são atividades cujo **ator é o próprio vendedor**, evitando atribuir trabalho do supervisor a ele.
- O total cobre até **500 oportunidades recentes por empresa/usuário autorizado** e até **5.000 eventos de cada tipo**; um aviso é exibido ao alcançar o limite. Dados incompletos não são totais empresariais.
- Não usar esses indicadores como produção comercial real antes de integrações e revisão de segurança.

## Segurança e privacidade

- `gc_digital_followup_events` tem RLS de leitura e inserção vinculadas à empresa, oportunidade e papel autorizado; **sem UPDATE nem DELETE** para aplicativo. Data e autor são definidos no banco.
- Trigger pós-inserção atualiza `next_action_on` da oportunidade na mesma transação. Uma falha desfaz todo o registro de atividade.
- Oportunidades encerradas permanecem imutáveis. Origem, empresa e vendedor não podem ser trocados pelo app.
- `gc_digital_credit_audit` é privada e só recebe gravações via trigger interno na alteração do crédito.
- **Não existe cadastro de dados pessoais de clientes.** Ainda não há integrações com Google Ads, WhatsApp, MCI ou CRM.
- Banco temporário `tilrqwcymhghmpvxukur`. A migração `gc_digital_followups_credit_v09` já foi aplicada nele; **não executar novamente** nesse banco ou nos bancos EPSA/GVS.

## Testes

1. `npm ci`, `npm audit --audit-level=high`, `npm test`, `npm run build` na branch v0.9.
2. Entrar como Marcos, abrir Vendas digitais e confirmar o painel de produtividade e agenda.
3. Na oportunidade fictícia `#86779122`, corrigir crédito de `250` para `250000`; conferir exibição R$ 250.000,00.
4. Registrar uma atividade de contato e escolher a próxima ação; verificar sua presença em Últimas atividades e na agenda.
5. Entrar como Ana e conferir oportunidades autorizadas. Bia e Carla não devem enxergar os dados da Empresa A.
6. Conferir que registros encerrados são imutáveis, sem novos follow-ups.
7. Conferir resultados presenciais sem alteração.

## Pendências para dados reais

Revisão de bases legais e retenção LGPD, proteção contra senhas vazadas no Supabase Auth, delimitação da integração CRM/MCI, identificação de oportunidades duplicadas, métricas de coorte e agregados paginados no servidor.
