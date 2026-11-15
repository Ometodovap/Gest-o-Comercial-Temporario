# EPSA Gestão Comercial v0.13 — Administração do piloto

## Escopo e limites
Nova aba **Administração**. A supervisão consulta estrutura autorizada. A diretoria gerencia empresas, stands, supervisores, vendedores e atribuições a stands. Nenhum cadastro real de clientes nesta etapa.

**Banco afetado:** somente Supabase Gestao Comercial Temporario, id tilrqwcymhghmpvxukur. EPSA Core e GVS não foram modificados.

## Migração
A migração gc_admin_foundation_v013 foi aplicada em 15/11/2026, versão 20261115150937. SQL integral em supabase/ADMIN_FOUNDATION_V013.sql. **Não reaplicar.**

### Segurança
Cinco endpoints públicos de RPC são SECURITY INVOKER, com concessão EXECUTE somente a authenticated e explicitamente revogados a PUBLIC/anon. A implementação privilegiada está no schema gc_private (não exposto ao Data API), com verificações internas de auth.uid(), empresa exata, papel manager e active=true:
- gc_admin_create_company — cria uma empresa e automaticamente associa o criador como manager; apenas um manager já existente pode usar, com limite 3 em 30 dias por criador
- gc_admin_rename_company — altera nome da empresa onde o gestor é manager ativo
- gc_admin_save_team — cadastra/edita stand em sua própria empresa; só aceita supervisor ativo da mesma empresa
- gc_admin_save_member — vincula/atualiza uma conta já existente no auth.users como seller/supervisor. Não altera a própria função nem concede manager, não modifica diretoria existente nem transfere identidade com associação ativa em outra empresa. Bloqueia alteração da supervisão enquanto houver stands sob seu comando
- gc_admin_assign_seller — atribui/suspende vendedor no stand; transferências desativam atribuições anteriores sem modificar o team_id dos relatórios históricos

Cada alteração gera evento na tabela gc_private.gc_admin_audit, com RLS habilitada e sem acesso direto de clientes da API.

**Admin Auth:** a interface nunca administra senhas, nunca usa service_role e não pode criar um novo usuário Auth. Para vincular uma conta de teste, um operador autorizado deve criar primeiro a conta fictícia no Authentication → Users do Supabase temporário e fornecer seu UID. Convites e gestão de senhas por aplicativo são fora do escopo desta versão.

## Verificações técnicas executadas
- O vendedor Ana tentou criar empresa via RPC e foi bloqueado.
- Marcos, ainda supervisor, tentou criar stand via RPC e foi bloqueado.
- Simulou-se **temporariamente** Marcos como manager na transação SQL (ROLLBACK): criação de nova empresa com diretoria inicial, cadastro de stand e transferência da vendedora para ele, com auditoria.
- Tentativa de anexar a usuária Bia da Empresa Parceira B à Empresa Piloto A foi bloqueada.
- Tentativa de alterar o próprio vínculo do manager foi bloqueada.
- Todas as mudanças simuladas foram revertidas; as contas permaneceram com papéis originais.

## Como homologar o frontend
1. Abrir preview Cloudflare da branch em ambiente de dados fictícios.
2. Entrar como Marcos: aba Administração deve exibir a estrutura autorizada (Stand Shopping A e Ana), sem formulários de edição.
3. Entrar como Carla: deve exibir somente a estrutura da Empresa Parceira B, sem ver Ana nem Stand A.
4. Entrar como Ana ou Bia: aba Administração **não deve aparecer**.
5. Os formulários de edição serão testados visualmente **após** provisionamento controlado de uma conta fictícia com papel manager; no momento não existe nenhuma nas duas empresas, e não se deve promover automaticamente o supervisor.
6. Verificar lint, npm audit, testes Node e build pelo GitHub Actions antes de integrar a branch.

## Pendências antes da operação real
- Provisionamento seguro do primeiro manager com autenticação forte e MFA
- Fluxo de convite ou cadastro Auth por backend autorizado, sem UID manual
- Proteção contra senhas vazadas (plano Pro+) e revisão LGPD
- Paginação administrativa e trilha de revisão de permissões
- Avaliar segurança de funções privadas e política de auditoria em cada alteração
