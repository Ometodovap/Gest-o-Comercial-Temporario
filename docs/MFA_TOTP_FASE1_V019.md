# EPSA Gestão Comercial — MFA TOTP fase 1 (homologação)

## Escopo
Somente app de homologação no Supabase `Gestao Comercial Temporario` (`tilrqwcymhghmpvxukur`), Cloudflare Pages `gest-o-comercial-temporario`. Sem mudanças em EPSA Core/GVS, sem clientes reais, sem novos pacotes npm e sem DDL.

## Implementação
- Menu **Segurança da conta** para Diretoria e Supervisão ativos: inicia `auth.mfa.enroll({factorType:'totp'})` apenas por clique; mostra QR/chave manual privados e ativa somente após `challenge` e `verify` usando código de seis dígitos.
- Sem cadastro automático ou alteração de senhas. Cancelar cadastro pendente tenta `unenroll`, sem excluir fatores já verificados.
- Usuários com fator TOTP ativo e sessão `aal1` devem fornecer código antes da interface comercial; `getAuthenticatorAssuranceLevel` distingue `aal1` e `aal2`. Sessões sem fator continuam normais.
- A navegação e carregamento de relatórios aguardam a confirmação MFA quando a conta já tem fator. O fluxo responde a eventos de autenticação e falha fechada em erros de consulta do nível AAL.
- Não existe botão para remover fatores verificados nesta etapa. Recomendar cadastro de segundo autenticador de reserva em dispositivo independente.
- Esta etapa **não** configura enforcement de MFA no RLS, nas Edge Functions nem torna MFA obrigatório para quem ainda não cadastrou. Uma verificação de UI sozinha não constitui proteção suficiente contra chamadas diretas à API.
- Supabase Auth TOTP está disponível no plano Free; proteção contra senhas vazadas continua pendente e exige Pro ou superior.

## Homologação sem ruptura
1. Conferir CI (`npm ci`, `npm audit --audit-level=high`, `npm test`, `npm run build`), Cloudflare Preview e login normal de Ana, Marcos e Diretoria com fatores ainda não ativados.
2. Como **Diretoria Piloto A** ou **Marcos Pereira**, entrar em **Segurança da conta**. Antes de cadastrar fator, verificar que o painel é voluntário e não aparece para vendedor.
3. Somente com aprovação do responsável pela conta de teste, configurar aplicativo autenticador, escanear QR e verificar código válido; QR, segredo e TOTP jamais devem ser copiados para logs, chats ou screenshots públicas.
4. Sair e entrar na mesma conta: confirmação do segundo fator deve aparecer antes do painel; código inválido mantém o bloqueio. Conferir retomada da sessão e saída.
5. Verificar acesso ao menu em telas menores, troca de abas sem refresh global, e comportamento ao cancelar cadastro pendente.
6. Preparar recuperação (segundo fator independente, procedimento de suporte) e testes de RLS `aal2` antes de aplicar obrigatoriedade no servidor.

## Bloqueios para operação real
- **0/5 fatores verificados** na auditoria de 15/11/2026; não alterar contas de demonstração unilateralmente.
- Enforcement na camada de dados (`aal2`) deve ser preparado e testado com cuidado para não bloquear a supervisão/diretoria ou funções administrativas. A autorização não pode depender de `user_metadata`.
- Definir tratamento de perda do autenticador, mudança de aparelho, MFA das contas de diretoria e revisão de LGPD.
- Manter homologação com dados fictícios.

Referências: https://supabase.com/docs/guides/auth/auth-mfa/totp e https://supabase.com/docs/guides/auth/auth-mfa
