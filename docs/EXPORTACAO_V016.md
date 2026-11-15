# EPSA Gestão Comercial v0.16 — exportações mensais para Excel

## Objetivo

Exportar dados operacionais *autorizados* do ambiente de homologação, sem consultar bancos externos e sem expor informações de clientes. A v0.16 não modifica o Supabase, o EPSA Core nem a GVS.

## Arquivos disponíveis

1. **Resultados → Exportar fechamentos CSV:** data, turno, vendedor, stand, situação, atendimentos, vendas imediatas, agendamentos, retornos, vendas por retorno, compradores, cotas, valor de crédito, conversão imediata.
2. **Produtividade por stand → Exportar stands CSV:** resumo por stand e metas mensais definidas separadamente, com apenas equipes sob responsabilidade do supervisor/diretor.

Os downloads usam UTF-8 com BOM, ponto e vírgula e valor decimal com vírgula (para Excel em português). Fórmulas digitadas como nomes de stands ou usuários são neutralizadas; aspas e separadores são escapados.

## Regras de consistência e segurança

- O frontend só usa o conjunto já devolvido pelo Supabase com RLS, filtrando novamente por empresa, competência, stand autorizado e vendedor próprio quando aplicável.
- Fechamentos **enviados e validados** entram nos relatórios. Rascunhos e devolvidos **não** entram.
- Conversão imediata = vendas imediatas ÷ atendimentos novos, sem incorporar vendas por retorno. Se não houver atendimentos, fica em branco (não 0%).
- Compradores = vendas imediatas + vendas por retorno; cotas seguem independentes.
- Metas não cadastradas ficam vazias, nunca somadas implicitamente como zero.
- O aplicativo atualmente busca até 1.000 fechamentos; quando recebe 1.000 ou mais, bloqueia os downloads para evitar exportação potencialmente incompleta. Para escala real, criar API paginada ou geração de relatório no servidor.
- Arquivos CSV não incluem IDs técnicos, CPF, telefone, e-mail de clientes, observações ou notas.
- Não há criação de endpoint, tabela, credencial nova nem envio automático a terceiros.

## Homologação sugerida

1. CI GitHub Actions: npm ci, npm audit --audit-level=high, npm test e npm run build.
2. Abrir Preview Cloudflare da branch feat/gestao-comercial-v016-exportacao-csv.
3. Login como Marcos. Em **Resultados**, mês novembro/2026, clicar Exportar fechamentos CSV. A planilha deve trazer Ana com fechamento de 13/11/2026: 20 atendimentos, 4 vendas imediatas, 1 por retorno, 5 compradores, 6 cotas, R$ 480.000,00 e 20,0% de conversão imediata.
4. Em **Produtividade por stand**, clicar Exportar stands CSV. Stand Shopping A deve constar; Stand Shopping B de outra empresa **não**.
5. Login como Ana. Resultados → exportar: apenas lançamentos dela. A aba Produtividade por stand não deve estar disponível.
6. Verificar no Excel que colunas não são quebradas indevidamente e números em reais possuem vírgula decimal.
7. **Não fazer merge na main** antes da validação visual.

## Limitações

Este relatório contém apenas os registros atualmente acessíveis e carregados pela interface, não é documento fiscal, extrato oficial de comissão nem relatório financeiro auditado. A exportação local transfere os dados ao computador de quem a solicita. Como ainda estamos em homologação, usar apenas dados fictícios.
