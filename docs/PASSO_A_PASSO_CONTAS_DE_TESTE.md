# EPSA Gestão Comercial — cadastro dos quatro usuários de homologação

**Projeto certo:** Gestão Comercial Temporário (`tilrqwcymhghmpvxukur`). Não use EPSA Core Platform nem GVS Imóveis.

## Situação confirmada

- 8 tabelas `gc_*` e migração `gc_initial_dev_schema_v05` já instaladas.
- Empresas fictícias `Empresa Piloto A` e `Empresa Parceira B` e seus stands já cadastrados.
- Nenhum usuário criado em Supabase Auth até a última verificação desta etapa.
- A aplicação **não aceita** autocadastro. O Supabase Auth precisa conhecer os quatro usuários antes do SQL de vinculação.

## Ação única no painel Supabase

1. Abra o painel do **projeto Gestão Comercial Temporário**.
2. No menu, escolha **Authentication → Users → Add user**.
3. Cadastre quatro e-mails de teste **somente se forem aceitos pelo painel**, confirme as contas no formulário administrativo e use **senhas únicas** (não `Demo@2026`). NUNCA envie senhas a este chat:

| Usuário | E-mail de teste | Papel | Empresa |
|---|---|---|---|
| Ana Martins | `ana@piloto.test` | seller | Empresa Piloto A |
| Marcos Pereira | `marcos@piloto.test` | supervisor | Empresa Piloto A |
| Bia Oliveira | `bia@parceira.test` | seller | Empresa Parceira B |
| Carla Souza | `carla@parceira.test` | supervisor | Empresa Parceira B |

Esses endereços são identificadores fictícios. Se o Supabase exigir e-mails reais verificáveis, use contas de teste que você controla, **anote quais são** e substitua as quatro comparações de e-mail no script de vinculação por esses valores. O nome exibido no aplicativo é definido pelo banco, não pelo endereço.

4. Após os quatro aparecerem em **Authentication → Users**, execute o script `docs/CONFIGURACAO_USUARIOS_TESTE.sql` no SQL Editor do **mesmo projeto**. O script não define senhas nem altera outros projetos. Ele só vincula usuários que já existem, às duas empresas fictícias.
5. Execute o SQL somente uma vez ou novamente quando necessário atualizar os vínculos, pois foi escrito com `ON CONFLICT`.
6. No VS Code, abra esta versão e execute `INICIAR_SUPABASE_WINDOWS.bat`, ou `npm install` e `npm run dev`.

## Roteiro rápido de teste

- Ana: acessar **Meu dia**, informar 20 atendimentos, 4 vendas imediatas, 5 agendamentos, 3 retornos, 1 venda por retorno, 6 cotas e R$ 480.000. **Enviar fechamento**.
- Marcos: acessar **Minha equipe** e **Validar** ou **Devolver** o fechamento. Registrar feedback sobre conversão.
- Ana: acessar **Meus feedbacks** e **Confirmar leitura**.
- Marcos: fazer uma revisão do acompanhamento.
- Bia e Carla: acessar o aplicativo e verificar que **não enxergam registros da empresa A**. Somente números fictícios nesta homologação.

## Se aparecer 'usuário autenticado, mas sem empresa ativa'

O usuário existe no Auth, mas seu vínculo não existe/está inativo. Execute o script de vinculação, volte ao aplicativo e **saia e entre de novo**.

## O que não fazer

Não execute a migração `SCHEMA_DEV_REVISAR_ANTES_DE_APLICAR.sql` outra vez: ela já foi aplicada. Não habilite acesso anônimo às tabelas `gc_*`, não coloque `service_role`/`sb_secret_...` no `.env`, não utilize dados de clientes, e não publique este ambiente em produção antes dos testes negativos de RLS com os quatro usuários.
