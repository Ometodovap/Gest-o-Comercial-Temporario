# EPSA Gestão Comercial v0.18 — Homologação de gráficos gerenciais

## Funcionalidades
Acesse **Painel gerencial**, exclusivamente como supervisor ou Diretoria ativa. Escolha uma competência, por exemplo novembro/2026.

- **Comparativo direto:** cada indicador aparece com uma barra para o mês imediatamente anterior e outra para o mês de referência: atendimentos, clientes compradores, cotas, créditos e conversão imediata. Escala comum apenas dentro de cada cartão (não comparar comprimento entre indicadores diferentes).
- **Diferença absoluta:** calculada quando existem dados dos dois períodos.
- **Diferença percentual:** calculada para atendimentos, compradores, cotas e créditos somente quando o período anterior possui valor maior que zero. Se o período anterior possui zero registrado, exibir "base anterior zero" e não divisão por zero.
- **Conversão imediata:** diferença entre taxas expressa em **pontos percentuais**, e não variação percentual relativa.
- **Gráfico de seis meses:** seletor de indicador na própria interface, com as cinco métricas disponíveis. A tabela detalhada de competências permanece abaixo.
- **Sem registros:** nunca converter ausência de fechamento em zero desempenho. Conversão de um mês com zero atendimentos novos permanece indisponível.
- Somente fechamentos enviados ou validados, com abrangência da empresa e stands permitidos. Digital permanece independente.
- Se a leitura carregar 1.000 registros, bloquear gráficos do painel para evitar resultados truncados.

## Verificações manuais na Cloudflare Preview
1. Acessar como Marcos Pereira, navegar até **Painel gerencial** e escolher novembro/2026. Deve mostrar 20 atendimentos, 5 compradores, 6 cotas, R$ 480.000 e conversão 20,0%.
2. No comparativo outubro x novembro, outubro deve aparecer como **Sem base** enquanto não houver fechamento de outubro; não mostrar um crescimento inventado de 0% a 20%.
3. Na evolução de seis meses, escolher cada indicador e verificar que novembro mostra, respectivamente: 20; 5; 6; R$ 480.000; 20,0%. Meses anteriores sem fechamentos apresentam **Sem registros**.
4. Simular outro mês sem dados, confirmando que não aparece taxa de 0% nem comparação percentual inventada.
5. Na conta de Ana Martins (vendedor), a opção **Painel gerencial** deve permanecer ausente.
6. Na conta de Carla Souza (Empresa Parceira B), não deve aparecer nenhum fechamento da Empresa Piloto A.
7. Checar responsividade e rolagem em celular e desktop; mudar de abas do navegador e voltar sem recarga visual global.
8. Verificar CI: npm ci; npm audit; npm test; npm run build.
9. Nenhum dado real de clientes deve ser usado na homologação.

## Decisões
Sem novas migrations e sem novos pacotes npm. Sem deploy para ambientes EPSA Core/GVS. A publicação na main deve ocorrer apenas depois da aprovação dos testes e da prévia Cloudflare.
