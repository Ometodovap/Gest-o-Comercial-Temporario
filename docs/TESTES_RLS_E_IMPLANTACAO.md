# Homologação exigida — EPSA Gestão Comercial

## Isolamento e privilégios

- [ ] Criar duas empresas de teste fictícias, A e B, num projeto exclusivo de desenvolvimento.
- [ ] Criar um vendedor e um supervisor na empresa A, outro vendedor e supervisor em B, além de um gestor de A.
- [ ] Verificar que usuário A não consegue ver ou escrever `gc_companies`, `gc_daily_reports`, `gc_coaching_feedback` e vínculos da empresa B.
- [ ] Verificar que vendedor A não enxerga lançamentos de outro vendedor da A e não consegue gerar registro usando o ID dele.
- [ ] Verificar que supervisor A só enxerga vendedores ativos vinculados às equipes que supervisiona.
- [ ] Impedir que o supervisor edite `atendimentos`, `cotas`, `valor_creditos` ou a identidade do vendedor ao validar/devolver.
- [ ] Impedir que o vendedor edite um fechamento `submitted` ou `validated` sem devolução.
- [ ] Impedir que o navegador insira/edite `gc_companies`, `gc_memberships`, `gc_teams`, `gc_team_members` e todas as tabelas de auditoria.
- [ ] Impedir a leitura de registros usando chave publishable/anon sem usuário autenticado.
- [ ] Confirmar que membro removido (`active=false`) perde acesso ao carregar nova sessão/requisitar dados.

## Fluxos de negócio

- [ ] Vendedor salva rascunho e envia inclusive zeros declarados; sem lançamentos aparece como ausência, não como zero.
- [ ] O banco rejeita contagens negativas, frações, cotas inferiores a compradores, vendas imediatas acima de atendimentos e vendas de retorno acima de retornos.
- [ ] Retornos não contam como novos atendimentos; testar conversão 4/20 = 20%, não 5/23.
- [ ] Reenvio após devolução limpa motivo e gera entrada de auditoria.
- [ ] O vendedor confirma leitura do próprio feedback; não consegue editar diagnóstico nem ação combinada.
- [ ] Supervisor registra uma única revisão do feedback; vendedor não altera essa avaliação.
- [ ] Verificar que `gc_report_audit` e `gc_feedback_audit` registram usuário, antes/depois, data/hora.
- [ ] Conferir interfaces no celular e em desktop, inclusive estados de erro/perda de rede.
- [ ] Executar Supabase Advisors (security/performance) após as migrações e revisar alertas antes da publicação.

## Migração, operação e LGPD

- [ ] Manter separados os bancos e chaves de dev e produção.
- [ ] Executar SQL somente no ambiente novo e revisar dependências, sintaxe e limites RLS antes de transformá-lo em migração CLI versionada.
- [ ] Não inserir dados reais de clientes no piloto. Revisar retenção, acesso, consentimentos/bases legais e controles LGPD antes de produção.
- [ ] Configurar Auth com cadastro público desabilitado; criar contas de teste via fluxo administrativo.
- [ ] Registrar custo/conta responsável pela hospedagem e pelo projeto Supabase.
- [ ] Publicar somente em preview Vercel depois de passar testes e configurar variáveis de ambiente de dev.
- [ ] Não compartilhar dados do EPSA Core / GVS: integração futura com autorização e arquitetura formal.

## Decisão necessária

A conexão Supabase atual apresenta a organização **Epsa Core** e os projetos ativos **EPSA Core Platform** e **Gvs Imóveis**. É necessário confirmar que o projeto novo deve ser criado nessa organização (e autorizar custo não nulo, se houver), antes de avançar para o provisionamento e os testes reais.
