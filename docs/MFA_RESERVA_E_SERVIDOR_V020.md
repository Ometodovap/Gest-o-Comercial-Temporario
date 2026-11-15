# EPSA Gestão Comercial v0.20 — autenticador de reserva e preparo para MFA no banco

**Ambiente:** projeto de homologação `Gestao Comercial Temporario` (Supabase `tilrqwcymhghmpvxukur`) + Cloudflare Pages `gest-o-comercial-temporario`. **Sem dados reais.** Não altera EPSA Core/GVS.

## Estado auditado em 15/11/2026

- Diretoria Piloto A: **um** fator TOTP verificado, sessão `aal2` observada. Marcos Pereira e Carla Souza: **zero** fatores verificados.
- A homologação das versões anteriores confirmou login com MFA, mas ainda faltam: fator reserva independente, teste de código inválido, recuperação administrativa, exigência do servidor.
- Ensaio de leitura, com `SET LOCAL ROLE authenticated`, GUC JWT simulada e `ROLLBACK`, retornou **dois** fechamentos para a Diretoria Piloto A tanto com `aal1` quanto com `aal2`. Isso mostra que **a RLS ainda não impõe MFA**; é uma pendência conhecida, não uma proteção ativa.

## Funcionalidades v0.20

1. Ao entrar em **Segurança da conta**, com um fator verificado, informar explicitamente que falta um dispositivo reserva.
2. Ao cadastrar outro fator, usar nome padrão *EPSA Reserva*. A confirmação requer QR/chave privada e `challenge` + `verify`; nunca gravar o segredo no GitHub, CSV, logs, relatórios ou screenshot.
3. Somente quando houver **dois ou mais fatores verificados**, oferecer **Testar autenticador de reserva**. O usuário seleciona o fator e informa o código daquele aplicativo; o servidor verifica por um novo desafio TOTP, com sessão `aal2`. Não altera outros fatores.
4. A confirmação é **somente desta sessão**. O aplicativo não pode provar se dois fatores estão em aparelhos fisicamente distintos; esta confirmação deve ser feita pelo responsável.
5. Após a verificação de reserva, preservar a interface sem recarregar o painel em função do evento MFA se já estiver pronta.
6. Não expor remoção de fatores cadastrados como funcionalidade de automação; não inventar códigos de recuperação.

## Procedimento de perda do celular (preparação, sem executar agora)

**Caso A — aplicativo de reserva ainda acessível:**
- Entrar normalmente com senha e usar o TOTP do segundo dispositivo; confirmar sessão `aal2`.
- Instalar outro aplicativo autenticador em dispositivo independente e cadastrar um substituto em **Segurança da conta**.
- O serviço de remoção de fator antigo deve ser desenvolvido separadamente com autenticação reforçada, confirmação explícita e auditoria; não consta desta fase.

**Caso B — todos os autenticadores perdidos:**
- O usuário não poderá completar o desafio. **Não** desabilitar MFA a pedido simples por chat, WhatsApp, telefone ou e-mail, nem usar senha ou `user_metadata` como prova suficiente.
- Registrar chamado interno, verificar identidade por procedimento independente da conta comprometida e obter aprovação de duas pessoas autorizadas; registrar o motivo e o operador.
- Administrador do projeto, **somente em ambiente privilegiado e não no browser**, pode usar a API oficial `supabase.auth.admin.mfa.deleteFactor({id, userId})`, com `service_role` mantida exclusivamente no servidor. Segundo a documentação, a remoção de um fator verificado encerra as sessões ativas.
- Rever outros fatores, sessões e o histórico de acesso, confirmar reautenticação do usuário e exigir novo cadastro MFA antes da retomada de operações privilegiadas.
- **Não executar recuperação automática** nem habilitar API pública de remoção de fatores. Nenhuma exclusão de fator ocorreu nesta fase.

## Preparação de enforcement em servidor (não aplicar ainda)

**Escopo proposto:** proteger leituras/escritas comerciais privilegiadas por `aal2` de diretoria/supervisão, sem bloquear vendedores ou usuários sem MFA antes da decisão de adesão.

A auditoria encontrou **11 tabelas com policies RLS** em `public.gc_*` (além de tabelas de auditoria com RLS sem policy de usuário), e nenhuma das policies existentes verifica `aal`. Existem RPCs públicas `gc_admin_*` invocadoras que usam implementações `SECURITY DEFINER` no esquema privado; também é necessário revisar o endpoint `gc-invite-user` e outros fluxos administrativos.

**Riscos de habilitar sem preparação:**
- Bloquear supervisor/diretoria antes do cadastramento e confirmação de TOTP.
- Proteger apenas as tabelas e ainda permitir operações privilegiadas por RPCs com `SECURITY DEFINER`.
- Bloquear usuários vendedores por políticas `RESTRICTIVE` globais sem discriminação de papel, ou criar recursão em políticas que consultam `gc_memberships`.
- Basear a decisão apenas em `user_metadata` (mutável pelo usuário) ou em checagem da interface.

**Plano de implantação controlada:**
1. Registrar e testar segundo fator independente de cada conta privilegiada; homologar caminho de perda total com operador autorizado.
2. Mapear operações e tabelas de leitura/escrita, incluindo RPCs `gc_admin_create_company`, `gc_admin_rename_company`, `gc_admin_save_team`, `gc_admin_save_member`, `gc_admin_assign_seller`, `gc_admin_event_feed`, outras funções privadas e `gc-invite-user`.
3. Preparar mudanças das policies com condições `auth.jwt()->>'aal'='aal2'` **somente para o papel/contexto que exigir MFA**, usando políticas restritivas quando apropriado, com condições `USING` e `WITH CHECK` para escritas; verificar anti-recursão. Proteger também corpos das implementações administrativas privilegiadas.
4. Testes transacionais (`BEGIN` / `SET LOCAL ROLE authenticated` / JWT `aal1` e `aal2` / `ROLLBACK`) para Diretoria, Marcos, Carla, Ana e Empresa Parceira B, sem alterar dados.
5. Só aplicar migração após CI e revisão de acesso, aprovação específica e plano de rollback. Conferir Auth, Edge Functions, Cloudflare Preview e Security Advisor após o rollout.

**Não há SQL de ativação de MFA incluído em `supabase/migrations` nesta entrega.**

## Checklist da homologação v0.20

- [ ] CI verde: instalação, auditoria de vulnerabilidades, testes e build.
- [ ] Cloudflare Preview publicado.
- [ ] A tela da Diretoria indica **1 autenticador** e risco de ausência de reserva.
- [ ] Cadastrar segundo fator em **outro dispositivo**, sem capturar QR ou código em chat.
- [ ] Selecionar fator reserva, testar código válido e inválido, e confirmar que o painel não recarrega.
- [ ] Sair e entrar usando somente o fator de reserva, mantendo o principal intacto.
- [ ] Reconfirmar RLS, permissões e separação entre empresas.
- [ ] **Não** habilitar obrigatório no servidor nem tratar dados reais nesta fase.

## Documentação oficial Supabase

- https://supabase.com/docs/guides/auth/auth-mfa/totp
- https://supabase.com/docs/guides/auth/auth-mfa
- https://supabase.com/docs/reference/javascript/auth-mfa
- https://supabase.com/docs/reference/javascript/auth-admin-deletefactor

**Distinção importante:** os novos códigos de recuperação da conta de desenvolvedor do Supabase Studio (changelog de 13/11/2026) **não** são códigos de recuperação do Supabase Auth dos usuários deste aplicativo.
