# EPSA Gestão Comercial v0.15 — Auditoria administrativa

## Escopo

Nesta versão a **Diretoria ativa de cada empresa** consulta os 30 eventos administrativos mais recentes da sua própria empresa. Vendedores e supervisores **não** têm acesso a essa área. Nenhum registro pode ser alterado pelo painel.

Inclui criação/edição de stands, atribuição de vendedores, alteração de colaboradores e empresas. A interface mostra data (fuso de Brasília), tipo da alteração, responsável e registro relacionado, **sem expor detalhes JSON da auditoria, senhas, e-mails ou tokens**.

**Somente ambiente de homologação:** projeto Supabase Gestão Comercial Temporário (id \`tilrqwcymhghmpvxukur\`). Nenhuma alteração em EPSA Core, GVS ou banco de dados comercial.

## Implementação

- SQL em \`supabase/ADMIN_EVENT_FEED_V015.sql\`. Migração \`gc_admin_event_feed_v015\` **já aplicada** no Supabase temporário; não reaplicar.
- Endpoint \`public.gc_admin_event_feed(company_id,limit)\`: \`SECURITY INVOKER\`, acessível somente a \`authenticated\`.
- Implementação \`gc_private.gc_admin_event_feed_impl\`: \`SECURITY DEFINER\` em schema não exposto ao PostgREST; valida \`auth.uid()\` e associação ativa \`manager\` da empresa informada, filtra \`company_id\`, limita 1–50 registros, retorna apenas cinco campos.
- A tabela \`gc_private.gc_admin_audit\` mantém RLS e continua **sem SELECT direto** para usuário do aplicativo.
- \`src/AdminAudit.tsx\`: componente reativo, carregamento/erro/estado vazio, botão atualizar, datas em \`America/Sao_Paulo\`.
- \`src/AdminWorkspace.tsx\`: consulta aparece só se \`role==='manager'\` e recarrega após operações administrativas bem-sucedidas.
- \`tests/admin-audit-v015.test.cjs\`: valida os invariantes de segurança e comportamento.

## Teste SQL confirmado (BEGIN/ROLLBACK)

Simulada criação de stand fictício pela conta Diretoria Piloto A. O evento aparece na auditoria da Empresa Piloto A. Tentativa da mesma diretoria de ler Empresa Parceira B: bloqueada. Supervisor Marcos e vendedora Ana: bloqueados. Papel \`anon\` não pode chamar a função, usuário autenticado não possui SELECT direto na tabela privada. A transação foi **revertida** e o stand simulado não permaneceu cadastrado.

## Homologação no navegador

1. Abra o deployment **Preview** da branch \`feat/gestao-comercial-v015-auditoria-administrativa\` na Cloudflare.
2. Entre como \`diretoria@piloto.test\`. Abra **Administração** e role até **Histórico administrativo**. No início, a área deve mostrar ausência de eventos caso ainda não tenha alterações realizadas pelo próprio aplicativo.
3. Se desejar registrar um evento de teste, altere somente um cadastro fictício já existente (por exemplo, o nome de um stand e depois volte ao original), e verifique o registro no histórico. Essa alteração fica gravada e será auditada. **Não utilize dados reais.**
4. Entre como Marcos: não deve ver **Histórico administrativo**. Entre como Ana: o menu Administração não deve aparecer.
5. Confirme \`npm ci\`, \`npm audit --audit-level=high\`, \`npm test\` e \`npm run build\` no GitHub Actions.
6. **Não fazer merge antes da homologação visual.**

## Limitações conhecidas

- O cadastro inicial da conta de Diretoria foi realizado diretamente no SQL e não foi lançado na tabela de auditoria; isso é indicado na interface. Eventos futuros gerados pelas RPCs administrativas são capturados.
- A auditoria é apenas uma janela recente (30 eventos), não um módulo de investigação completo; não há paginação ou download.
- A tabela de histórico de convites \`gc_invite_history\` é separada e não aparece nesta consulta; convites reais continuam desativados.
