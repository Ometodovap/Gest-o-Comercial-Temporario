# Alterar o e-mail da Diretoria Piloto A — sem criar usuário

**Objetivo:** migrar somente o e-mail principal da conta autenticada com MFA, de `diretoria@piloto.test` para `contato.gvs.diretoria@gmail.com`. Preservar o mesmo `auth.uid()`, RLS, membership e fator TOTP.

## Implementação na interface
- Em **Segurança da conta**, aparece a ação **Atualizar e-mail da Diretoria Piloto A** apenas enquanto a conta atual usa `diretoria@piloto.test` e tem papel de diretoria.
- A ação exige confirmação do próprio usuário, sessão com `aal2`, verificação do usuário via `auth.getUser()` e chama `auth.updateUser({email: ...},{emailRedirectTo: ...})` (API oficial, sem chaves secretas).
- O retorno indica **solicitação enviada**, não afirma mudança já aplicada. A troca exige confirmação conforme as configurações de Auth.
- A conta permanece cadastrada com e-mail antigo até a confirmação final; o botão deixa de aparecer depois que o novo e-mail passa a constar no token/usuário.

## Ajuste necessário no Supabase Auth (sem alteração programática)
O endereço antigo é fictício, portanto não pode confirmar alterações por e-mail.
1. Na dashboard do **projeto Gestão Comercial Temporário**, abrir **Authentication → Sign In / Providers → Email**.
2. **Durante esta alteração**, desativar a opção **Secure email change** (que por padrão envia confirmação tanto ao endereço antigo quanto ao novo). Isso faz a confirmação depender apenas do **endereço novo**. A configuração é do projeto inteiro: não deixar desativada desnecessariamente após a operação.
3. Na EPSA Gestão Comercial, entrar como Diretoria Piloto A e confirmar o MFA como já testado. Ir a **Segurança da conta** e clicar **Solicitar alteração de e-mail**.
4. Abrir a caixa de `contato.gvs.diretoria@gmail.com` e confirmar o link recebido.
5. Reabrir a página Authentication → Users para verificar se a **mesma identidade/UID** apresenta o novo e-mail, sem mexer nos outros quatro usuários, e reativar **Secure email change**.
6. Conferir **Authentication → URL Configuration** se o link de confirmação não redirecionar corretamente para `https://gest-o-comercial-temporario.pages.dev/`.
7. Testar login com e-mail novo, senha atual e segundo fator; testar o fluxo **Esqueci minha senha** sem trocar fatores MFA.

### Restrições
- Nenhuma migração de banco, Auth user, e-mail ou fator alterados pelo GitHub.
- Não criar usuário substituto, não editar diretamente `auth.users` ou `auth.identities`, não expor `service_role`.
- A opção **Secure email change** precisa ser alterada pelo responsável no painel; o conector Supabase atual não oferece alteração da configuração Auth.
- O link e a entrega de e-mails dependem da configuração de remetente/SMTP e da lista de redirecionamentos. Não afirmar entrega ou confirmação sem teste.
