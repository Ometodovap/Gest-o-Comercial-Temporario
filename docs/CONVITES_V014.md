# EPSA Gestão Comercial v0.14 — Convites seguros, piloto

## Escopo

Este código aplica-se **somente** ao projeto Supabase Gestão Comercial Temporário `tilrqwcymhghmpvxukur` e ao repositório `Ometodovap/Gest-o-Comercial-Temporario`. Não altera EPSA Core, GVS, MCI ou suas bases de dados.

A v0.14 permite pré-validar convites para vendedores e supervisores a partir da aba Administração, **sem exigir copiar UID manualmente**. O envio de e-mails e a criação de contas ficam **desativados por padrão**. Não utilize dados reais de clientes nesta etapa.

## Estrutura entregue

- `src/AdminWorkspace.tsx`: nome, e-mail fictício, função (vendedor/supervisor), botão Pré-validar convite. A prévia informa se a identidade e as permissões são válidas.
- `supabase/functions/gc-invite-user/index.ts`: backend Supabase Edge Function, protegida por JWT válido e confirmação de identidade no servidor com `auth.getUser`.
- `supabase/INVITE_HISTORY_V014.sql`: já aplicada ao banco temporário como migração `gc_secure_invite_history_v014`. Registra tentativas futuras de envio em `public.gc_invite_history`, com RLS, sem policies para usuários comuns, sem GRANT anônimo/autenticado e com GRANT explícito para `service_role`. O banco já está atualizado — não reexecutar SQL manualmente.
- Testes automatizados em `tests/invite-v014.test.cjs`.

## Segurança

1. A Edge Function exige um JWT válido de usuário. Ela confere no banco que o solicitante é `manager` ativo **na empresa indicada**, sem confiar em papel/UID enviados no formulário ou claims editáveis de `user_metadata`.
2. A URL para retorno após convite não é aceita do cliente. Quando o recurso for liberado, só aceitará URL HTTPS `https://gest-o-comercial-temporario.pages.dev/` configurada no servidor.
3. O serviço de e-mail só será usado quando **todos** os requisitos forem configurados manualmente **no ambiente da Edge Function**: `GC_INVITES_ENABLED=true`, `GC_MAIL_READY=true` e `GC_INVITE_REDIRECT_URL=https://gest-o-comercial-temporario.pages.dev/`. Se faltar um, requisições de envio retornam 409 **sem enviar mensagens**.
4. O envio exige confirmação explícita na interface, depois de uma prévia. O botão fica desabilitado enquanto o servidor comunicar `sending_enabled=false`.
5. Logs de convites ficam restritos ao backend; não há tokens, links de convite nem chaves `service_role` no frontend.
6. Com o envio ativado no futuro, limita 10 tentativas por diretoria em 24 horas e impede duplicidade de convite ativo por empresa/e-mail. Tentativas concorrentes são rejeitadas por índice único.
7. O vínculo ao negócio é realizado pela RPC `gc_admin_save_member` usando a identidade da própria Diretoria. Se um convite for criado, mas não for possível cadastrar o vínculo, registra `link_pending` e **não permite repetir o envio automaticamente**.
8. A auditoria guarda e-mail de destinatário e nome somente quando o envio estiver liberado e for solicitado. Para produção real, definir retenção e requisitos LGPD antes de habilitar.

## Dependências para habilitar envio real futuramente

- Configurar **SMTP próprio** no Supabase Auth, pois o provedor padrão da plataforma restringe o envio a endereços previamente autorizados (documentação oficial: https://supabase.com/docs/guides/auth/auth-smtp).
- Validar DNS e domínio de remetente, modelo de convite, `Site URL`, Redirect URLs e fluxo completo de cadastro/senha/aceitação.
- Revisar políticas de senhas comprometidas (recurso disponível no Supabase Pro+), MFA, LGPD, limitação de abuso, rate limits e comportamento para usuários com contas existentes.
- Executar testes reais com e-mails controlados e autorizados; **não usar domínios .test para tentar entregar convites reais**.
- Planejar reconciliação de falhas no vínculo após envio; uma mensagem pode ter sido enviada mesmo que a operação de vínculo falhe.

## Homologação prevista

1. GitHub Actions: `npm ci`, `npm audit --audit-level=high`, `npm test` e `npm run build`.
2. No preview Cloudflare da branch, login como `diretoria@piloto.test`, abrir Administração → Convidar vendedor ou supervisor.
3. Preencher nome `Vendedor Teste V014`, e-mail `vendedor-v014@piloto.test` e função Vendedor → clicar **Pré-validar convite**.
4. Deve aparecer **Envio indisponível nesta homologação** e botão de envio **desabilitado**. Nenhum e-mail deve ser enviado e nenhum usuário Auth criado.
5. Login como Marcos: painel de supervisão deve ser somente leitura, sem formulário de convite.
6. Login como Ana: aba Administração não deve estar disponível.
7. Conferir no banco que `gc_invite_history` segue vazia e nenhuma conta fictícia adicional foi criada pela prévia.
8. **Não integrar à main sem confirmação do fluxo de prévia e restrição por perfil.**

## Limitações

Esta etapa **não habilita convites reais**. O cadastro manual por UID da v0.13 permanece disponível para testes. A preparação para envio futuro está implementada, mas a ativação exigirá aprovação e configuração específica de SMTP, autenticação e monitoramento.
