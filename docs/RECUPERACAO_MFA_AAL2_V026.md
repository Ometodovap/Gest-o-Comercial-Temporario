# Recuperação de senha + MFA — correção v0.26 (19/11/2026)

## Falha observada
O e-mail chegou e o link abriu **Definir nova senha** no domínio oficial. Ao salvar, Supabase Auth retornou:
`AAL2 session is required to update email or password when MFA is enabled`.

A sessão de recuperação era `aal1` e a conta Diretoria Piloto A possui TOTP verificado. O componente `SetRecoveredPassword` era exibido **antes** do gate MFA, permitindo o envio da nova senha enquanto a sessão ainda não tinha `aal2`.

## Correção
- No evento oficial `PASSWORD_RECOVERY`, marcar a recuperação ativa e **reavaliar imediatamente o nível AAL**, mesmo se o usuário autenticado continuar com o mesmo UUID.
- Mostrar estado de verificação e, quando necessário, o desafio TOTP já existente antes de apresentar **Definir nova senha**.
- Confirmar o fator pelo Supabase (`auth.mfa.challenge` e `auth.mfa.verify`) para promover a sessão a `aal2`. Não gerar novo fator nem enviar códigos por e-mail.
- Só depois de o gate indicar `ready`, liberar o formulário `SetRecoveredPassword` com `auth.updateUser({password})` e confirmação explícita do usuário.
- Após sucesso, encerrar a sessão e exigir novo login (com MFA).
- Uma conta sem fator verificado continua no fluxo original de recuperação.

## Homologação
- Testes automáticos cobrem ordenação do gate, reset no evento `PASSWORD_RECOVERY`, desafio de fator existente e ausência de alteração silenciosa de senha.
- GitHub CI e Cloudflare Preview antes de integração.
- **Não alterar a senha da Diretoria automaticamente** e não disparar outro reset sem necessidade.
- Verificação manual final: solicitar novo link no login, confirmar MFA usando aplicativo existente, verificar abertura do formulário de nova senha. Para preservar a senha, **não clicar em Salvar nova senha** durante essa homologação.
- Um teste completo de gravação e novo login exigiria autorização específica ou conta fictícia separada.

## Limites
O Supabase rejeita a troca de senha sem `aal2` quando há fator MFA, independentemente de como a tela foi acessada; este ajuste respeita a validação do servidor. Não altera políticas RLS, Edge Functions, usuários, fatores, e-mail, SMTP nem qualquer dado comercial. Projeto continua piloto com dados fictícios.
