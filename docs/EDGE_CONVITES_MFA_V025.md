# EPSA Gestão Comercial — preflight do convite com MFA no servidor (v0.25)

**Projeto:** apenas Gestão Comercial Temporário. Não altera EPSA Core/GVS.

A função ativa `gc-invite-user` usa o Supabase Admin (service_role) para validar convites e criar usuários quando os flags de envio estão habilitados. Embora verificasse o usuário por `auth.getUser` e o papel de Diretoria, o endpoint não exigia `aal2` antes de consultar dados administrativos.

## Correção
O cliente com a chave **pública** e o `Authorization` do **próprio usuário** executa `public.gc_admin_event_feed(companyId,1)`, função validada na v0.23:
- Diretoria autorizada com TOTP verificado exige JWT `aal2`.
- Diretoria sem fator verificado mantém a regra anterior por empresa e papel.
- Supervisão e vendedores são negados pela própria RPC.
- Qualquer erro de RPC bloqueia o endpoint (HTTP 403).
- A validação ocorre antes de `gc_memberships`, `gc_invite_history` e `auth.admin.inviteUserByEmail` com `service_role`.

Esta mudança reaproveita a RPC existente de auditoria como barreira de autorização, evitando nova função pública. Os dados da auditoria não são retornados ao chamador.

## Verificação
1. Conferir que o código implantado coincide com o GitHub (versão anterior 1 validada).
2. CI de testes estáticos e build, sem novos pacotes.
3. Implantação somente da função `gc-invite-user`, com `verify_jwt:true`; os flags `GC_INVITES_ENABLED` e `GC_MAIL_READY` não devem ser ativados.
4. Ler o código retornado por `get_edge_function` para verificar igualdade com a branch e `verify_jwt:true`.
5. Não realizar envio real de convite. Antes de habilitar SMTP/convites, executar testes de preview com JWT válido: manager `aal1` com TOTP deve receber 403; `aal2` pode chegar ao resultado de preview; vendedor e empresa não autorizada recebem 403.

**Limite:** acesso de usuários sem MFA continua condicionado ao vínculo ativo da Diretoria. O endurecimento total fica condicionado à decisão de obrigatoriedade e recuperação de acesso.

Nenhum dado comercial ou conta foi alterado.
