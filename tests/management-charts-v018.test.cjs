const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const charts=import('./compiled/managementCharts.js');

function mk(attrs={}){
 return {atendimentos:20,vendas_imediatas:4,agendamentos:3,retornos:2,vendas_retorno:1,
  cotas:6,valor_creditos:480000,days:1,conversion:20,compradores:5,
  fechamentos:1,validados:1,pendentes:0,hasRecords:true,...attrs};
}
test('v0.18: comparativo de cinco indicadores preserva diferenças de clientes e cotas',async()=>{
 const {compareMetric}=await charts;
 const curr=mk(),prev=mk({atendimentos:10,compradores:2,cotas:3,valor_creditos:240000,conversion:10});
 assert.deepEqual([compareMetric(curr,prev,'atendimentos').delta,compareMetric(curr,prev,'compradores').delta,compareMetric(curr,prev,'cotas').delta], [10,3,3]);
 assert.equal(compareMetric(curr,prev,'valor_creditos').relativeChange,100);
 assert.equal(compareMetric(curr,prev,'compradores').relativeChange,150);
});
test('v0.18: conversão é comparada em pontos percentuais, não crescimento relativo',async()=>{
 const {compareMetric}=await charts;
 const c=compareMetric(mk({conversion:20}),mk({conversion:15}),'conversion');
 assert.equal(c.delta,5);
 assert.equal(c.variationType,'percentage_points');
 assert.equal(c.relativeChange,null);
});
test('v0.18: conversão negativa em pontos percentuais preserva sinal',async()=>{
 const {compareMetric}=await charts;
 assert.equal(compareMetric(mk({conversion:10}),mk({conversion:20}),'conversion').delta,-10);
});
test('v0.18: mês sem relatório não gera diferenças, nem é tratado como zero',async()=>{
 const {compareMetric}=await charts;
 const curr=mk({hasRecords:false,compradores:0,conversion:null});
 const prev=mk({compradores:5,conversion:20});
 const c=compareMetric(curr,prev,'compradores');
 assert.equal(c.current,null);
 assert.equal(c.delta,null);
 assert.equal(c.relativeChange,null);
});
test('v0.18: zero registrado é diferente de ausência de registros',async()=>{
 const {compareMetric,trendPoints}=await charts;
 const zero=mk({compradores:0,conversion:null});
 const missing=mk({hasRecords:false,compradores:0,conversion:null});
 assert.equal(compareMetric(zero,mk(),'compradores').current,0);
 assert.equal(compareMetric(missing,mk(),'compradores').current,null);
 const trend=trendPoints([{month:'2026-10',stats:zero},{month:'2026-11',stats:missing}],'compradores');
 assert.deepEqual(trend.map(x=>x.value),[0,null]);
});
test('v0.18: divisão por zero no mês anterior não produz porcentagem fictícia',async()=>{
 const {compareMetric}=await charts;
 const c=compareMetric(mk({compradores:5}),mk({compradores:0}),'compradores');
 assert.equal(c.delta,5);
 assert.equal(c.relativeChange,null);
});
test('v0.18: conversão permanece sem base quando não há atendimentos novos',async()=>{
 const {compareMetric,trendPoints}=await charts;
 const zeroBase=mk({atendimentos:0,vendas_imediatas:0,conversion:null});
 assert.equal(compareMetric(zeroBase,mk(),'conversion').delta,null);
 assert.deepEqual(trendPoints([{month:'2026-11',stats:zeroBase}],'conversion').map(x=>x.value),[null]);
});
test('v0.18: séries para os cinco indicadores preservam números e ausência',async()=>{
 const {trendPoints,resultMetricOptions}=await charts;
 const periods=[{month:'2026-10',stats:mk({hasRecords:false})},{month:'2026-11',stats:mk()}];
 assert.equal(resultMetricOptions.length,5);
 assert.deepEqual(resultMetricOptions.map(o=>trendPoints(periods,o.key).map(x=>x.value)),[
  [null,20],[null,5],[null,6],[null,480000],[null,20]
 ]);
});
test('v0.18: barras usam escala comum e não criam largura infinita em zero',async()=>{
 const {relativeBarWidths}=await charts;
 assert.deepEqual(relativeBarWidths(25,50),{current:50,previous:100});
 assert.deepEqual(relativeBarWidths(0,0),{current:0,previous:0});
 assert.deepEqual(relativeBarWidths(null,10),{current:0,previous:100});
});
test('v0.18: painel usa filtros e permissões existentes, com gráficos próprios',()=>{
 const dashboard=fs.readFileSync(path.join(__dirname,'../src/ManagementDashboard.tsx'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../src/ManagementCharts.tsx'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
 assert.match(dashboard,/if\(role==='seller'\)return null/);
 assert.match(dashboard,/managementOverview\(/);
 assert.match(dashboard,/ManagementMonthComparison/);
 assert.match(dashboard,/ManagementTrendChart/);
 assert.match(ui,/useState<ResultMetric>\('compradores'\)/);
 assert.match(ui,/aria-pressed/);
 assert.match(app,/tab==='management'&&\(role==='manager'\|\|role==='supervisor'\)/);
});
