(function (root, factory) {
  const domain = factory();
  if (typeof module === 'object' && module.exports) module.exports = domain;
  if (root) root.GcDomain = domain;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const numberFields = [
    'atendimentos', 'vendasImediatas', 'agendamentos', 'retornos',
    'vendasRetorno', 'cotas'
  ];

  function validateEntry(entry) {
    const errors = {};
    for (const field of numberFields) {
      const value = Number(entry[field]);
      if (entry[field] === '' || entry[field] === null || entry[field] === undefined || !Number.isInteger(value) || value < 0) {
        errors[field] = 'Informe um número inteiro maior ou igual a zero.';
      }
    }
    const valor = Number(entry.valorCreditos);
    if (entry.valorCreditos === '' || !Number.isFinite(valor) || valor < 0) {
      errors.valorCreditos = 'Informe um valor válido maior ou igual a zero.';
    }
    if (!errors.vendasImediatas && !errors.atendimentos && Number(entry.vendasImediatas) > Number(entry.atendimentos)) {
      errors.vendasImediatas = 'As vendas imediatas não podem superar os novos atendimentos.';
    }
    if (!errors.vendasRetorno && !errors.retornos && Number(entry.vendasRetorno) > Number(entry.retornos)) {
      errors.vendasRetorno = 'As vendas por retorno não podem superar os retornos realizados.';
    }
    const buyers = Number(entry.vendasImediatas) + Number(entry.vendasRetorno);
    if (Number.isFinite(buyers) && !errors.cotas && Number(entry.cotas) < buyers) {
      errors.cotas = 'Informe pelo menos uma cota para cada cliente comprador.';
    }
    if (!entry.workDate || !/^\d{4}-\d{2}-\d{2}$/.test(entry.workDate)) {
      errors.workDate = 'Informe uma data válida.';
    }
    if (!['full', 'morning', 'afternoon', 'evening'].includes(entry.shift)) {
      errors.shift = 'Selecione um turno.';
    }
    if (String(entry.notes || '').length > 500) {
      errors.notes = 'A observação deve ter até 500 caracteres.';
    }
    return errors;
  }

  function sumReports(reports) {
    const sums = Object.fromEntries([...numberFields, 'valorCreditos'].map(k => [k, 0]));
    for (const item of reports) {
      for (const key of Object.keys(sums)) sums[key] += Number(item[key]) || 0;
    }
    const buyers = sums.vendasImediatas + sums.vendasRetorno;
    return {
      ...sums,
      compradores: buyers,
      conversaoImediata: sums.atendimentos > 0 ? (sums.vendasImediatas / sums.atendimentos) * 100 : null,
      cotasPorDia: reports.length > 0 ? sums.cotas / new Set(reports.map(r => `${r.sellerId}:${r.workDate}`)).size : null
    };
  }

  // Compare independent, fixed seven-day periods around the date of a coaching action.
  // A 'day with a report' is NOT necessarily a scheduled/working day.
  function utcDay(date, delta) {
    const parsed = new Date(`${date}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setUTCDate(parsed.getUTCDate() + delta);
    return parsed.toISOString().slice(0, 10);
  }

  function evolutionOfFeedback(feedback, reports, asOfDate) {
    const anchor = feedback.feedbackDate || feedback.createdAt.slice(0, 10);
    const beforeStart = utcDay(anchor, -7);
    const beforeEnd = utcDay(anchor, -1);
    const afterStart = utcDay(anchor, 1);
    // Limit the period to seven days and do not include future or post-review results.
    const afterEnd = [utcDay(anchor, 7), feedback.reviewDate || asOfDate, asOfDate].sort()[0];
    const relevant = reports.filter(r => r.sellerId === feedback.sellerId && ['submitted', 'validated'].includes(r.status));
    const interval = (start, end) => {
      const rows = start && end && start <= end ? relevant.filter(r => r.workDate >= start && r.workDate <= end) : [];
      const summary = sumReports(rows);
      const days = new Set(rows.map(r => r.workDate)).size;
      return {start, end, days, summary,
        atendimentosPorDia: days ? summary.atendimentos / days : null,
        vendasPorDia: days ? summary.vendasImediatas / days : null,
        cotasPorDia: days ? summary.cotas / days : null};
    };
    const before = interval(beforeStart, beforeEnd);
    const after = interval(afterStart, afterEnd);
    const hasComparableData = before.days >= 3 && after.days >= 3 && before.summary.conversaoImediata !== null && after.summary.conversaoImediata !== null;
    return {before, after, hasComparableData,
      deltaConversao: hasComparableData ? after.summary.conversaoImediata - before.summary.conversaoImediata : null,
      deltaAtendimentosPorDia: hasComparableData ? after.atendimentosPorDia - before.atendimentosPorDia : null,
      deltaVendasPorDia: hasComparableData ? after.vendasPorDia - before.vendasPorDia : null};
  }

  function statusLabel(status) {
    return { draft: 'Rascunho', submitted: 'Enviado', validated: 'Validado', returned: 'Devolvido' }[status] || 'Sem registro';
  }

  function coachingHint(stats, goals) {
    if (!stats || stats.atendimentos === 0) return 'Sem volume suficiente para diagnosticar conversão. Verifique primeiro os registros e os dias trabalhados.';
    const avgAtt = (goals && goals.atendimentosDia) || 20;
    const conv = (goals && goals.conversaoImediata) || 20;
    if (stats.atendimentos < avgAtt && stats.conversaoImediata >= conv) {
      return 'Boa conversão com baixo volume: trabalhar consistência de abordagens e horários de maior movimento.';
    }
    if (stats.atendimentos >= avgAtt && stats.conversaoImediata < conv) {
      return 'Volume adequado e conversão abaixo da referência: observar sondagem, apresentação de valor e fechamento.';
    }
    if (stats.agendamentos > stats.retornos * 2) {
      return 'Agendamentos elevados em relação aos retornos realizados: revisar confirmação e acompanhamento dos compromissos.';
    }
    return 'Acompanhar consistência dos resultados e identificar práticas positivas que possam ser compartilhadas.';
  }

  function todaySaoPaulo() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(item => [item.type, item.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }

  return { numberFields, validateEntry, sumReports, statusLabel, coachingHint, todaySaoPaulo, evolutionOfFeedback, utcDay };
});
