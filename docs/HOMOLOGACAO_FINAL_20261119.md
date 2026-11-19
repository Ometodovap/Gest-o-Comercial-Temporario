# EPSA Gestão Comercial — homologação final em 19/11/2026

**Decisão: manter o piloto com dados fictícios.** Esta rodada verificou a função de convites, a solicitação de recuperação e os controles de privacidade pertinentes à entrada em operação comercial.

## Convites e MFA

O Cloudflare Pages está com deploy de produção bem-sucedido da main em `9694452`. A Edge Function `gc-invite-user` v2 está ativa com `verify_jwt=true`, e o arquivo implantado é idêntico ao arquivo desse commit. O endpoint público retornou HTTP 401 para uma prévia sem sessão.

A RPC de autorização da função, `gc_admin_event_feed`, foi executada no banco publicado em transação somente leitura com os vínculos ativos de teste e valores de AAL simulados. Fora do ambiente publicado, o handler exato foi executado com dependências simuladas em seis casos. Nos cinco casos negados, a execução parou na RPC antes de consultar vínculos e histórico privilegiados.

| Perfil | RPC aal1 | RPC aal2 | Handler local aal1 | Handler local aal2 |
| --- | --- | --- | --- | --- |
| Diretoria com TOTP verificado | Negado (42501) | Permitido | 403 | 200 |
| Supervisão | Negado (42501) | Negado (42501) | 403 | 403 |
| Vendedor | Negado (42501) | Negado (42501) | 403 | 403 |

O ambiente tem uma Diretoria ativa com fator verificado e dois vínculos ativos por papel de Supervisão e Vendedor, todos sem fator verificado nesses dois papéis. O resultado cobre a regra de autorização e o fluxo local do handler. A prévia autenticada na função publicada segue pendente. Usar somente `action=preview` com alvo `homologacao@example.invalid`, sessão de cada papel e empresa piloto. Confirmar 403 para Diretoria em aal1, 200 para a mesma Diretoria em aal2, e 403 para Supervisão e Vendedor em aal1. Os casos aal2 destes dois papéis ficam cobertos pela matriz simulada enquanto as contas piloto carecem de fatores cadastrados. Nenhum convite foi enviado.

## Recuperação de senha

O endpoint Auth aceitou a solicitação para o Gmail cadastrado da Diretoria com HTTP 200, usando a URL de retorno usada pelo aplicativo publicado. O endereço está confirmado no Auth e `recovery_sent_at` registrou 17h46min23s (Brasília). O registro do Auth confirma a etapa do servidor. O recebimento na caixa de destino e a abertura do formulário de nova senha permanecem pendentes. A caixa conectada nesta rodada pertence a outro endereço. A senha existente foi preservada. Para fechar o teste, conferir a mensagem na caixa da Diretoria, abrir o formulário no domínio publicado e encerrar ali. O salvamento e novo login podem ser homologados com conta de teste separada ou com autorização para alterar a senha existente.

## Privacidade e LGPD

O catálogo publicado mostra RLS em 18/18 tabelas `gc_*` de `public` e `gc_private`, sem leitura anônima. Os eventos de etapa e de retorno do funil têm acesso autenticado por políticas que vinculam a oportunidade, a empresa e o vendedor ou gestor autorizado. O histórico de convites pode guardar nome e e-mail. Fechamentos e feedbacks guardam dados de desempenho e texto livre. O funil atual usa dados estruturados sem cadastro nominal de leads. Os CSVs carregam nomes e indicadores de desempenho de vendedores, já limitados pelos dados retornados ao usuário, e passam a existir fora do aplicativo após o download.

| Prioridade | Pendência e evidência de fechamento |
| --- | --- |
| Crítica | Formalizar por finalidade quem decide sobre o tratamento e quem opera os dados, incluindo EPSA, GVS e fornecedores conforme o papel efetivo. Registrar finalidades, categorias, bases legais, destinatários e eventuais transferências internacionais. Publicar aviso e indicar o canal responsável pelo atendimento a titulares. |
| Crítica | Definir e aplicar a retenção de contas, relatórios, feedbacks, convites, auditoria e exportações. Identificar responsáveis por acesso, correção, exclusão ou anonimização conforme a finalidade e testar o fluxo com dados fictícios. Orientar a equipe sobre texto livre e compartilhamento e descarte de CSVs. |
| Crítica | Designar responsável por incidentes e registrar procedimento para conter, avaliar e comunicar os casos aplicáveis. Conforme a ANPD, o prazo geral é de três dias úteis quando houver risco ou dano relevante, ressalvada norma específica. |
| Crítica antes da liberação | Confirmar recuperação no Gmail da Diretoria até o formulário no domínio publicado. Validar a entrega a usuários finais se o mesmo mecanismo for usado no onboarding ou suporte comercial. |
| Crítica para habilitar convites | Fechar a prévia autenticada publicada e validar separadamente as condições de entrega por e-mail. O uso comercial com provisionamento controlado pode manter o envio automático desativado. |
| Crítica antes da carga real | Identificar os registros fictícios, definir o ambiente de destino e aprovar o plano de transição com responsáveis e backup recuperável. Preservar a base atual durante a homologação. |
| Não bloqueante no escopo inicial | Proteção nativa contra senhas vazadas aparece como aviso no Supabase. Registrar a decisão operacional sobre senhas antes da entrada de usuários. Sete avisos informativos de RLS sem policy devem ser tratados de acordo com a exposição intencional das tabelas. |
| Não bloqueante no escopo inicial | Evolução de paginação CSV e integração nominal com CRM. Os relatórios já bloqueiam exportação no limite de carregamento. A entrada de leads identificáveis requer revisão própria de finalidade, acesso e retenção. |

## Verificações

- 170 testes aprovados, build concluído e `npm audit --audit-level=high` com zero vulnerabilidades.
- Branch apenas documental. Nenhuma alteração de código, políticas, usuários, senhas, fatores ou registros comerciais.

[Lei Geral de Proteção de Dados](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) · [Comunicação de incidentes à ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis) · [Envio de e-mails no Supabase Auth](https://supabase.com/docs/guides/auth/auth-smtp)
