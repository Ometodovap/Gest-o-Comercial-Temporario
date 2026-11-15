# EPSA Gestão Comercial — recuperação de senha por e-mail (v0.21)

**Objetivo:** simplificar a experiência de acesso e atender à decisão de recuperar **senha** pelo endereço de e-mail cadastrado, sem pedir autenticador de reserva. Aplicativo hospedado na Cloudflare Pages e Supabase **Gestão Comercial Temporário**, somente homologação.

## Mudanças no aplicativo
- O login tem **Esqueci minha senha**. O usuário informa o e-mail vinculado à sua conta.
- A solicitação usa a API oficial `supabase.auth.resetPasswordForEmail(email, {redirectTo: ...})` e exibe uma resposta neutra, sem revelar existência de contas.
- O link retorna à URL de produção `https://gest-o-comercial-temporario.pages.dev/`; quando o evento oficial `PASSWORD_RECOVERY` ocorre, o aplicativo mostra **Definir nova senha**. A alteração utiliza `supabase.auth.updateUser({password})`; o aplicativo encerra a sessão e pede novo login.
- A interface de MFA foi simplificada: sem alerta insistente de apenas um dispositivo e sem solicitação de autenticador de reserva. Contas com MFA ativo continuam exigindo o código. MFA continua opcional para outras contas nesta fase.
- Nenhum Auth user, senha, fator TOTP, policy RLS ou projeto EPSA Core/GVS foi alterado nesta entrega.

## Configurações pendentes para entrega de e-mail real
- Em 15/11/2026, a conta fictícia **Diretoria Piloto A** usa `diretoria@piloto.test` no Supabase Auth. Esse domínio é fictício e **não recebe links de recuperação**.
- **Aguardando e-mail empresarial real indicado pelo responsável**, sem supor nem reaproveitar endereços de outra empresa. Cadastrar/validar o e-mail real no Auth com fluxo administrativo apropriado; não editar `auth.users` diretamente em SQL e não modificar conta sem confirmação do destino.
- Confirmar a permissão de redirecionamento do Supabase Auth em **Authentication → URL Configuration** para `https://gest-o-comercial-temporario.pages.dev/` (Site URL/Redirect URLs). A configuração não foi modificada pelo PR.
- Conferir se há envio de e-mails configurado/limites SMTP para destinatários reais. **Não afirmar que o e-mail foi entregue antes de executar o teste ponta a ponta**.
- Homologar solicitação do link, recebimento, abertura, gravação da nova senha, saída, login e preservação de permissões/fator MFA existente.

## Distinção operacional
- Redefinir a senha por e-mail **não elimina nem recupera um segundo fator de autenticação (TOTP) já cadastrado**. Caso a pessoa perca o autenticador, é necessário procedimento administrativo separado com verificação de identidade.
- Não ativar obrigatoriedade MFA no banco enquanto o uso continuar em homologação; não remover o MFA existente sem aprovação específica.
- Nenhum dado real de cliente deve ser inserido no ambiente temporário.

## Referências
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-mfa
