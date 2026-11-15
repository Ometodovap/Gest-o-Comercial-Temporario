# EPSA Gestão Comercial v0.17 — Painel gerencial presencial

## Escopo
Nova opção **Painel gerencial** na navegação de Supervisão e Diretoria. Os indicadores presenciais são apresentados separadamente da área **Vendas digitais**. Sem acesso a dados pessoais de clientes e sem criar novas tabelas, credenciais ou serviços.

### Métricas
- Competência selecionada, com seis meses consecutivos incluindo a referência.
- Atendimentos novos, compradores (imediatos + retorno), conversão imediata, cotas e créditos, sem média de taxas entre vendedores.
- Diferença de compradores para o mês **imediatamente** anterior quando ambos os períodos têm registros válidos.
- Diferença em pontos percentuais de conversão imediata somente quando há denominadores válidos nos dois meses.
- Comparação entre stands atualmente autorizados ao perfil, ordenada por compradores, cotas e créditos; o stand histórico de cada fechamento é preservado.
- Metas da equipe por stand, **não** as metas somadas dos vendedores. Quando algum stand autorizado não possui meta positiva, o progresso consolidado fica indisponível e a cobertura é exibida (N de T).
- Meses ou stands sem fechamentos enviados/validados mostram **Sem registros**, não zero produtividade.

### Segurança e qualidade
- Somente Supervisão e Diretoria ativas veem o menu e o componente; o componente também recusa a função de vendedor.
- Dados consultados com RLS existente e novamente filtrados no cálculo por empresa, IDs dos stands atualmente autorizados e janela de seis meses.
- Exclui rascunhos e fechamentos devolvidos dos KPIs.
- Se o fetch global atingir o limite de 1.000 registros, bloqueia gráficos e rankings e explica que é necessária consulta paginada: não rotular base truncada como desempenho real.
- Em meses selecionados no passado, a série considera o intervalo encerrado na competência escolhida, nunca períodos futuros.
- Sem alteração no Supabase, dados existentes ou ambientes EPSA Core e GVS.

## Roteiro de homologação no Preview Cloudflare
1. Entrar com **Marcos Pereira**, selecionar **Painel gerencial**, competência **novembro/2026**. A tela deve mostrar **20 atendimentos, 5 compradores, 6 cotas, R$ 480.000 em créditos e 20,0% de conversão imediata**.
2. Na evolução de seis meses, junho a outubro devem exibir "Sem registros" caso não haja outros fechamentos; novembro deve exibir 5 compradores e conversão 20,0%.
3. Em comparação entre stands, deve aparecer **Stand Shopping A**, com 1 fechamento validado.
4. As metas próprias de Stand Shopping A: 200 atendimentos, 20 compradores, 24 cotas, R$ 1.920.000. Atingimentos: 10%, 25%, 25% e 25%.
5. Entrar com **Ana Martins**: não deve existir menu "Painel gerencial".
6. Entrar com **Carla Souza** na Empresa Parceira B: não deve aparecer a produção do Stand Shopping A, nem metas da Empresa Piloto A.
7. Na competência sem dados, não exibir "0%" como se existisse medição de conversão.
8. Trocar de abas do navegador e voltar. Não deve ocorrer recarga global desnecessária.
9. CI: npm ci, npm audit --audit-level=high, npm test, npm run build.
10. Manter PR em draft até a revisão da interface. Não incluir registros reais de clientes.

## Pontos futuros
- Para escalabilidade, criar agregação autorizada no servidor ou paginação de fechamentos. Com 1.000 registros carregados, a v0.17 interrompe a apresentação de tendências, em vez de oferecer um resultado possivelmente incompleto.
- O painel é presencial; a inteligência digital continua separada até existir política de deduplicação de oportunidades e atendimentos.
