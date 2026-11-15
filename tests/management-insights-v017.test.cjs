const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const features=import('./compiled/managementInsights.js');

const a={id:'a',company_id:'company-a',team_id:'team-a',seller_id:'ana',work_date:'2026-11-13',
 shift:'full',atendimentos:20,vendas_imediatas:4,agendamentos:5,retornos:3,
 vendas_retorno:1,cotas:6,valor_creditos:480000,notes:'',status:'validated',
 created_at:'',updated_at:'',returned_reason:''};
const b={...a,id:'b',team_id:'team-b',seller_id:'other',atendimentos:10,
 vendas_imediatas:2,retornos:0,vendas_retorno:0,cotas:2,valor_creditos:150000};
const teams=[
 {id:'team-a',company_id:'company-a',name:'Shopping A',unit_name:'Centro A',supervisor_user_id:'marcos'},
 {id:'team-b',company_id:'company-a',name:'Shopping B',unit_name:'Centro B',supervisor_user_id:'marcos'},
 {id:'team-x',company_id:'company-b',name:'Privado',unit_name:'Outro',supervisor_user_id:'carla'}
];
const goal={id:'g',company_id:'company-a',team_id:'team-a',month_start:'2026-11-01',
 goal_atendimentos:200,goal_vendas:20,goal_cotas:24,goal_creditos:1920000};
const base={companyId:'company-a',month:'2026-11',reports:[a,b],
 teams,goals:[goal],allowedTeamIds:['team-a','team-b']};

test('v0.17: últimos seis meses incluem virada do ano e rejeitam datas inválidas',async()=>{
 const {monthsEnding}=await features;
 assert.deepEqual(monthsEnding('2026-02'),['2025-09','2025-10','2025-11','2025-12','2026-01','2026-02']);
 assert.deepEqual(monthsEnding('2026-11'),['2026-06','2026-07','2026-08','2026-09','2026-10','2026-11']);
 assert.throws(()=>monthsEnding('2026-13'),/inválido/);
});
test('v0.17: conversão consolidada é ponderada, não a média das taxas',async()=>{
 const {managementOverview}=await features;
 const {selected}=managementOverview(base);
 assert.equal(selected.atendimentos,30);
 assert.equal(selected.vendas_imediatas,6);
 assert.equal(selected.vendas_retorno,1);
 assert.equal(selected.compradores,7);
 assert.equal(selected.cotas,8);
 assert.equal(selected.valor_creditos,630000);
 assert.equal(selected.conversion,20);
 assert.equal(selected.fechamentos,2);
 assert.equal(selected.validados,2);
});
test('v0.17: retornos fazem parte dos compradores, não da conversão imediata',async()=>{
 const {managementOverview}=await features;
 const {selected}=managementOverview({...base,reports:[a]});
 assert.equal(selected.compradores,5);
 assert.equal(selected.conversion,20);
});
test('v0.17: tenant e stands são filtrados de novo antes da comparação',async()=>{
 const {managementOverview}=await features;
 const reportOtherCompany={...a,id:'foreign',company_id:'company-b',team_id:'team-x',atendimentos:900,valor_creditos:100000000};
 const future={...a,id:'future',work_date:'2026-12-01'};
 const outsideWindow={...a,id:'old',work_date:'2026-01-12'};
 const x=managementOverview({...base,allowedTeamIds:['team-a'],reports:[a,b,reportOtherCompany,future,outsideWindow]});
 assert.equal(x.selected.atendimentos,20);
 assert.equal(x.stands.length,1);
 assert.equal(x.stands[0].team.id,'team-a');
 assert.equal(x.selected.valor_creditos,480000);
 assert.ok(x.months.every(m=>m.stats.atendimentos<900));
});
test('v0.17: rascunhos e devolvidos não contam, mas enviado e validado contam',async()=>{
 const {managementOverview}=await features;
 const rows=[a,{...a,id:'draft',status:'draft',atendimentos:800},
  {...a,id:'returned',status:'returned',atendimentos:700},
  {...a,id:'submitted',status:'submitted',atendimentos:3,vendas_imediatas:0,vendas_retorno:0,cotas:0,valor_creditos:0}];
 const x=managementOverview({...base,reports:rows});
 assert.equal(x.selected.atendimentos,23);
 assert.equal(x.selected.validados,1);
 assert.equal(x.selected.pendentes,1);
 assert.equal(x.selected.fechamentos,2);
});
test('v0.17: sem registros não é zero desempenho nem variação inventada',async()=>{
 const {managementOverview,buyerDifference,ppDifference}=await features;
 const x=managementOverview({...base,reports:[]});
 assert.equal(x.selected.hasRecords,false);
 assert.equal(x.selected.conversion,null);
 assert.equal(x.months.length,6);
 assert.ok(x.months.every(m=>!m.stats.hasRecords));
 assert.equal(buyerDifference(x.selected,x.previous),null);
 assert.equal(ppDifference(x.selected,x.previous),null);
});
test('v0.17: comparação usa mês anterior e variação de conversão em p.p.',async()=>{
 const {managementOverview,buyerDifference,ppDifference}=await features;
 const oct={...a,id:'oct',work_date:'2026-10-10',atendimentos:10,vendas_imediatas:1,
  retornos:0,vendas_retorno:0,cotas:1,valor_creditos:75000};
 const x=managementOverview({...base,reports:[a,oct],allowedTeamIds:['team-a']});
 assert.equal(x.previous.atendimentos,10);
 assert.equal(x.previous.conversion,10);
 assert.equal(x.selected.conversion,20);
 assert.equal(buyerDifference(x.selected,x.previous),4);
 assert.equal(ppDifference(x.selected,x.previous),10);
});
test('v0.17: meta incompleta não produz porcentagem consolidada enganosa',async()=>{
 const {managementOverview}=await features;
 const x=managementOverview(base);
 const buyers=x.targets.find(t=>t.key==='goal_vendas');
 assert.equal(buyers.configured,1);
 assert.equal(buyers.total,2);
 assert.equal(buyers.target,20);
 assert.equal(buyers.complete,false);
 assert.equal(buyers.progress,null);
 assert.equal(x.stands[0].team.id,'team-a');
});
test('v0.17: meta completa é somada só por stand, independente das metas de vendedores',async()=>{
 const {managementOverview}=await features;
 const bGoal={...goal,id:'bg',team_id:'team-b',goal_atendimentos:100,goal_vendas:10,goal_cotas:20,goal_creditos:500000};
 const x=managementOverview({...base,goals:[goal,bGoal]});
 const buyers=x.targets.find(t=>t.key==='goal_vendas');
 assert.equal(buyers.complete,true);
 assert.equal(buyers.target,30);
 assert.equal(buyers.progress,7/30*100);
});
test('v0.17: metas e comparativos não vazam de outras empresas',async()=>{
 const {managementOverview}=await features;
 const foreign={...goal,id:'fx',company_id:'company-b',team_id:'team-x',goal_vendas:800};
 const x=managementOverview({...base,goals:[...base.goals,foreign]});
 assert.equal(x.stands.length,2);
 assert.equal(x.targets.find(t=>t.key==='goal_vendas').target,20);
});
test('v0.17: relatório com zero atendimentos declarado mantém conversão indisponível',async()=>{
 const {managementOverview}=await features;
 const zero={...a,id:'zero',atendimentos:0,vendas_imediatas:0,vendas_retorno:0,cotas:0,valor_creditos:0};
 const x=managementOverview({...base,reports:[zero]});
 assert.equal(x.selected.hasRecords,true);
 assert.equal(x.selected.conversion,null);
 assert.equal(x.selected.compradores,0);
});
test('v0.17: limite de 1000 registros impede análise incompleta',async()=>{
 const {managementOverview}=await features;
 assert.equal(managementOverview({...base,reports:Array.from({length:999},(_,i)=>({...a,id:String(i)}))}).incomplete,false);
 assert.equal(managementOverview({...base,reports:Array.from({length:1000},(_,i)=>({...a,id:String(i)}))}).incomplete,true);
});
test('v0.17: painel está protegido no menu e interface, separado do funil digital',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../src/ManagementDashboard.tsx'),'utf8');
 assert.match(app,/id:'management',label:'Painel gerencial',allowed:role==='supervisor'\|\|role==='manager'/);
 assert.match(app,/tab==='management'&&\(role==='manager'\|\|role==='supervisor'\)/);
 assert.match(ui,/if\(role==='seller'\)return null/);
 assert.match(ui,/allowedTeamIds:teams\.map\(x=>x\.id\)/);
 assert.match(ui,/Operação digital — acompanhamento separado/);
});
