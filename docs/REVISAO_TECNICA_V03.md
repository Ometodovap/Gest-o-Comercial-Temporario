# Registro de implementação — v0.3

**Data:** 13/11/2026 — versão preparatória, sem implantação em ambiente remoto.

## Feito no código

- Novo frontend React/TypeScript/Vite independente, conexão por variáveis de ambiente.
- Supabase Auth com login por e-mail/senha; perfis lidos do banco, não selecionados arbitrariamente.
- Formulário presencial com save draft/submit e transições de supervisor.
- Resultados, histórico, feedback, confirmação de leitura e revisão com períodos antes/depois.
- Script SQL novo com 8 tabelas isoladas por prefixo `gc_`, helpers privados, triggers e políticas RLS; administração de associações fora do browser.
- Testes de domínio e verificações estáticas do esquema.

## Limites dos testes

- Testes automatizados locais verificam regras matemáticas e contratos estáticos, **não** a aplicação de políticas Postgres.
- Nenhum `CREATE TABLE`, autenticação real, registro em Supabase, Vercel ou GitHub foi executado.
- Não há `package-lock.json` porque o registro npm não respondeu nesta sessão; instalar dependências, gerar lockfile e rodar build completo antes de CI/deploy.
- A revisão de segurança é preliminar; o SQL deve ser homologado em um projeto Supabase novo de desenvolvimento antes de ser aplicado ou versionado como migração de produção.

## Próximo passo desbloqueado por uma decisão

É necessário que o responsável escolha/confirme a organização do Supabase para um projeto de desenvolvimento completamente separado. A organização disponível na conexão é **Epsa Core**. Antes de criar, consultar custo da nova instância e obter autorização expressa para qualquer valor não nulo. Depois, aplicar e testar com duas empresas fictícias isoladas.
