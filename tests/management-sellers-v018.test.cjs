const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const modulePromise=import('./compiled/managementInsights.js');
const report=(id,company_id,team_id,seller_id,work_date,atendimentos,compradores)=>({
 id,company_id,team_id,seller_id,work_date,shift:'full',status:'validated',
 atendimentos,vendas_imediatas:compradores,agendamentos:0,retornos:0,
 vendas_retorno:0,cotas:compradores,valor_creditos:compradores*100000,
 notes:'',returned_reason:'',created_at:'',updated_at:''
});
const teams=[
 {id:'stand-a',company_id:'company-a',name:'Stand A',unit_name:'Centro',supervisor_user_id:'marcos'},
 {id:'stand-b',company_id:'company-a',name:'Stand B',unit_name:'Norte',supervisor_user_id:'other'},
 {id:'stand-c',company_id:'company-b',name:'Stand C',unit_name:'Sul',supervisor_user_id:'carla'}
];
const reports=[
 report('1','company-a','stand-a','ana','2026-11-13',20,4),
 report('2','company-a','stand-a','beto','2026-11-13',10,2),
 report('3','company-a','stand-b','ana','2026-11-13',900,90),
 report('4','company-b','stand-c','ana','2026-11-13',800,80),
 report('5','company-a','stand-a','ana','2026-10-13',10,1)
];
const people=[
 {company_id:'company-a',user_id:'ana',role:'seller',display_name:'Ana',active:true},
 {company_id:'company-a',user_id:'beto',role:'seller',display_name:'Beto',active:true},
 {company_id:'company-a',user_id:'clara',role:'seller',display_name:'Clara',active:true},
 {company_id:'company-a',user_id:'inactive',role:'seller',display_name:'Inativa',active:false},
 {company_id:'company-b',user_id:'ana',role:'seller',display_name:'Ana de outra empresa',active:true}
];
const assignments=[
 {company_id:'company-a',team_id:'stand-a',seller_id:'clara',active:true},
 {company_id:'company-a',team_id:'stand-b',seller_id:'ana',active:true},
 {company_id:'company-b',team_id:'stand-c',seller_id:'ana',active:true}
];
test('v0.18: seletor só mostra vendedores ativos ligados ao stand autorizado atual ou histórico',async()=>{
 const {managementSellerOptions}=await modulePromise;
 const names=managementSellerOptions({companyId:'company-a',teams:[teams[0]],people,assignments,reports});
 assert.deepEqual(names.map(x=>x.display_name),['Ana','Beto','Clara']);
});
test('v0.18: histórico de vendas no stand permite selecionar vendedor transferido',async()=>{
 const {managementSellerOptions}=await modulePromise;
 const options=managementSellerOptions({companyId:'company-a',teams:[teams[0]],people,
  assignments:assignments.filter(a=>a.seller_id!=='ana'),reports});
 assert.ok(options.some(s=>s.user_id==='ana'));
});
test('v0.18: vínculo inativo, outro stand e outra empresa não entram no seletor',async()=>{
 const {managementSellerOptions}=await modulePromise;
 const out=managementSellerOptions({companyId:'company-a',teams:[teams[1]],people,assignments,reports});
 assert.deepEqual(out.map(x=>x.user_id),['ana']);
});
test('v0.18: comparativo individual considera só resultados do vendedor em stand autorizado',async()=>{
 const {managementOverview}=await modulePromise;
 const overview=managementOverview({companyId:'company-a',month:'2026-11',reports,
  teams:[teams[0]],goals:[],allowedTeamIds:['stand-a'],sellerId:'ana'});
 assert.equal(overview.selected.atendimentos,20);
 assert.equal(overview.selected.compradores,4);
 assert.equal(overview.selected.valor_creditos,400000);
 assert.equal(overview.previous.atendimentos,10);
 assert.equal(overview.previous.compradores,1);
});
test('v0.18: consolidado continua somando somente stands autorizados',async()=>{
 const {managementOverview}=await modulePromise;
 const overview=managementOverview({companyId:'company-a',month:'2026-11',reports,
  teams:[teams[0]],goals:[],allowedTeamIds:['stand-a']});
 assert.equal(overview.selected.atendimentos,30);
 assert.equal(overview.selected.compradores,6);
});
test('v0.18: vendedor sem registros não recebe zero como desempenho medido',async()=>{
 const {managementOverview}=await modulePromise;
 const overview=managementOverview({companyId:'company-a',month:'2026-11',reports,
  teams:[teams[0]],goals:[],allowedTeamIds:['stand-a'],sellerId:'clara'});
 assert.equal(overview.selected.hasRecords,false);
 assert.equal(overview.selected.conversion,null);
});
test('v0.18: tela vincula somente colaboradores permitidos e metas individuais',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/ManagementDashboard.tsx'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
 assert.match(ui,/managementSellerOptions/);
 assert.match(ui,/sellerId/);
 assert.match(ui,/Metas individuais/);
 assert.match(ui,/Toda a equipe \(consolidado\)/);
 assert.match(ui,/if\(role==='seller'\)return null/);
 assert.match(app,/people=\{people\} assignments=\{assignments\} sellerGoals=\{goals\}/);
});
