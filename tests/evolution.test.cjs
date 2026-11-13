const test = require('node:test');
const assert = require('node:assert/strict');
const {evolutionOfFeedback, utcDay} = require('../domain.cjs');
const feedback = {sellerId:'s1',createdAt:'2026-11-06T15:00:00Z',feedbackDate:'2026-11-06',reviewDate:'2026-11-13'};
function row(date, atendimentos, vendasImediatas, status='validated', sellerId='s1') {
  return {sellerId,workDate:date,atendimentos,vendasImediatas,agendamentos:0,retornos:0,vendasRetorno:0,cotas:vendasImediatas,valorCreditos:0,status};
}
test('evolução compara janelas de sete dias, conversão ponderada e variação em pontos percentuais',()=>{
  const reports=[];
  for(let i=-7;i<=-1;i++) reports.push(row(utcDay(feedback.feedbackDate,i),20,2));
  for(let i=1;i<=7;i++) reports.push(row(utcDay(feedback.feedbackDate,i),20,4));
  const e=evolutionOfFeedback(feedback,reports,'2026-11-13');
  assert.equal(e.before.days,7);assert.equal(e.after.days,7);
  assert.equal(e.before.summary.conversaoImediata,10);
  assert.equal(e.after.summary.conversaoImediata,20);
  assert.equal(e.deltaConversao,10);
  assert.equal(e.deltaVendasPorDia,2);
  assert.equal(e.hasComparableData,true);
});
test('sem lançamentos posteriores não equivale a zero e não gera variação',()=>{
  const reports=[];
  for(let i=-7;i<=-1;i++) reports.push(row(utcDay(feedback.feedbackDate,i),20,2));
  const e=evolutionOfFeedback(feedback,reports,'2026-11-13');
  assert.equal(e.after.days,0);
  assert.equal(e.after.atendimentosPorDia,null);
  assert.equal(e.deltaConversao,null);
  assert.equal(e.hasComparableData,false);
});
test('exclui dados de outros vendedores, devolvidos e futuros',()=>{
  const reports=[];
  for(let i=-7;i<=-1;i++) reports.push(row(utcDay(feedback.feedbackDate,i),20,2));
  for(let i=1;i<=2;i++) reports.push(row(utcDay(feedback.feedbackDate,i),20,4));
  reports.push(row('2026-11-11',99,99,'draft'));
  reports.push(row('2026-11-11',99,99,'validated','s2'));
  reports.push(row('2026-11-14',99,99));
  const e=evolutionOfFeedback(feedback,reports,'2026-11-13');
  assert.equal(e.after.days,2);
  assert.equal(e.after.summary.atendimentos,40);
  assert.equal(e.hasComparableData,false);
});
test('duas jornadas no mesmo dia são contadas como apenas um dia com lançamento',()=>{
  const reports=[];
  for(let i=-7;i<=-1;i++) reports.push(row(utcDay(feedback.feedbackDate,i),20,2));
  for(let i=1;i<=3;i++) {
    reports.push(row(utcDay(feedback.feedbackDate,i),10,2));
    reports.push(row(utcDay(feedback.feedbackDate,i),10,2));
  }
  const e=evolutionOfFeedback(feedback,reports,'2026-11-13');
  assert.equal(e.after.days,3);
  assert.equal(e.after.atendimentosPorDia,20);
  assert.equal(e.after.summary.conversaoImediata,20);
});
