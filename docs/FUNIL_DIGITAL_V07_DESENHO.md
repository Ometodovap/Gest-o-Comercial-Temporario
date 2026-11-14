# EPSA Gestão Comercial — desenho do funil digital (v0.7)

**Situação: especificado e com regras de transição testadas; NÃO habilitado no banco nem na interface de produção.**

## Princípio

Uma oportunidade digital percorre `prospecção/lead recebido → contato estabelecido → qualificação → proposta enviada → negociação/acompanhamento → venda concluída`; pode ser marcada como **perdida** antes de concluir. Essas etapas são diferentes dos indicadores rápidos de atendimento do stand. O vendedor pode trabalhar em ambas as modalidades, mas cada oportunidade possui origem/modalidade inequívoca.

## Próxima modelagem (não aplicada)

- `gc_digital_opportunities`: `id`, `company_id`, `seller_id`, `stage`, `lead_source`, `created_at`, `updated_at`, `next_action_at`, `lost_reason_code`. Não incluir dados pessoais de cliente na v0.7.
- `gc_digital_stage_events`: histórico imutável de transições, autor, momento; bloquear escrita direta e inserir via função validada.
- Cada acesso requer vínculo ativo à empresa, propriedade da oportunidade ou supervisão real sobre o vendedor. Proibir alterar `company_id`/`seller_id` via interface.
- Uma oportunidade não deve ser contada duas vezes como novo lead; estágios de venda/perda são terminais.
- Na integração futura com CRM EPSA/MCI Consórcio, usar identificador externo e mapeamento de origem, não replicar dados pessoais sem análise jurídica/segurança.

## Indicadores propostos

Leads captados, percentual contatado, qualificados, propostas enviadas, taxa de conversão leads→vendas, tempo em etapa e follow-ups vencidos. **Não criar dados falsos nem tratar ausência de registro como zero de atividade.**

## Portões de segurança antes de habilitar

Revisar LGPD/base legal, retenção, consentimentos quando exigidos, autenticação, RLS por empresa e vendedor, testes cruzados; teste de duplicidade em captação e validação da integração CRM. Atualmente apenas documentado, sem uso com dados reais.
