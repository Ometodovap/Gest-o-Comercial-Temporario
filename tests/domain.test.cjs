const test = require('node:test');
const assert = require('node:assert/strict');
const {validateEntry, sumReports, coachingHint} = require('../domain.cjs');
const makeEntry = (patch = {}) => ({ workDate:'2026-11-13', shift:'full', atendimentos:20, vendasImediatas:4, agendamentos:5, retornos:3, vendasRetorno:1, cotas:6, valorCreditos:480000, notes:'', ...patch });
test('lançamento presencial válido, inclusive zeros declarados', () => {
  assert.deepEqual(validateEntry(makeEntry()), {});
  assert.deepEqual(validateEntry(makeEntry({atendimentos:0,vendasImediatas:0,agendamentos:0,retornos:0,vendasRetorno:0,cotas:0,valorCreditos:0})), {});
});
test('não permite vendas maiores do que atendimentos ou retornos', () => {
  assert.match(validateEntry(makeEntry({vendasImediatas:21})).vendasImediatas,/não podem superar/);
  assert.match(validateEntry(makeEntry({vendasRetorno:4})).vendasRetorno,/não podem superar/);
});
test('cotas >= clientes compradores', () => {
  assert.ok(validateEntry(makeEntry({cotas:4})).cotas);
});
test('não aceita negativos, decimais e campos vazios', () => {
  assert.ok(validateEntry(makeEntry({atendimentos:-1})).atendimentos);
  assert.ok(validateEntry(makeEntry({atendimentos:1.5})).atendimentos);
  assert.ok(validateEntry(makeEntry({atendimentos:''})).atendimentos);
});
test('conversão imediata evita divisão por zero', () => {
  const result = sumReports([makeEntry({sellerId:'ana'})]);
  assert.equal(result.conversaoImediata,20);
  const zero = sumReports([makeEntry({sellerId:'ana',atendimentos:0,vendasImediatas:0})]);
  assert.equal(zero.conversaoImediata,null);
});
test('vendas de retorno não inflam conversão de novos atendimentos', () => {
  const result = sumReports([makeEntry({sellerId:'ana',atendimentos:20,vendasImediatas:4,vendasRetorno:1})]);
  assert.equal(result.compradores,5);
  assert.equal(result.conversaoImediata,20);
});
test('média por dia evita contar dois turnos como dois dias', () => {
  const report = makeEntry({sellerId:'ana'});
  const r = sumReports([report,{...report,shift:'evening'}]);
  assert.equal(r.cotasPorDia,12);
});
test('sugestão de feedback sem dados não diagnostica conversão', () => {
  assert.match(coachingHint(sumReports([]),{atendimentosDia:20}),/Sem volume suficiente/);
});
