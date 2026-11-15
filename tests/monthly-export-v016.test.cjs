const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const exported=import('./compiled/monthlyExport.js');
const base={
 id:'r1',company_id:'company-a',team_id:'team-a',seller_id:'seller-a',
 work_date:'2026-11-13',shift:'full',
 atendimentos:20,vendas_imediatas:4,agendamentos:5,retornos:3,
 vendas_retorno:1,cotas:6,valor_creditos:480000,notes:'DEVE SER OMITIDA',
 status:'validated',returned_reason:'NÃO EXPORTAR',created_at:'',updated_at:''
};
const b={
 companyId:'company-a',companyName:'Empresa Piloto A',month:'2026-11',
 people:[{company_id:'company-a',user_id:'seller-a',display_name:'Ana Martins',active:true,role:'seller'}],
 teams:[{id:'team-a',company_id:'company-a',name:'Stand Shopping A',unit_name:'Shopping A',supervisor_user_id:null}],
 reports:[base]
};
test('v0.16: CSV possui BOM, separador Excel pt-BR e proteção contra fórmula',async()=>{
 const {csvCell,csvDocument}=await exported;
 assert.equal(csvCell('=HYPERLINK("url")'),'"\'=HYPERLINK(""url"")"');
 assert.equal(csvCell('\t+cmd\n'),'"\' +cmd "');
 assert.equal(csvCell('Setor; Norte'),'"Setor; Norte"');
 assert.equal(csvCell('A"Z'),'"A""Z"');
 assert.ok(csvDocument([['a','b']]).startsWith('\uFEFF"a";"b"\r\n'));
});
test('v0.16: fechamento usa comprador imediato+retorno sem inflar conversão',async()=>{
 const {buildClosuresCsv}=await exported;
 const csv=buildClosuresCsv(b);
 assert.ok(csv.includes('Ana Martins'));
 assert.ok(csv.includes('"20";"4";"5";"3";"1";"5";"6";"480000,00";"20,0"'));
 assert.ok(csv.includes('2026-11-13'));
 assert.ok(!csv.includes('DEVE SER OMITIDA')&&!csv.includes('NÃO EXPORTAR'));
});
test('v0.16: registros não validados ou de outra empresa/mês/stand/vendedor são excluídos',async()=>{
 const {buildClosuresCsv}=await exported;
 const extra=[
 {...base,id:'d',status:'draft'},
 {...base,id:'e',status:'returned'},
 {...base,id:'foreign',company_id:'company-b'},
 {...base,id:'other_month',work_date:'2026-10-13'},
 {...base,id:'other_team',team_id:'team-b'},
 {...base,id:'other_seller',seller_id:'seller-b'}
 ];
 const scoped=buildClosuresCsv({...b,reports:[...extra,base],allowedTeamIds:['team-a'],ownSellerId:'seller-a'});
 assert.equal((scoped.match(/"2026-11-13"/g)||[]).length,1);
 assert.ok(!scoped.includes('Vendedor não identificado'));
});
test('v0.16: supervisor exporta apenas stands de sua gestão',async()=>{
 const {buildStandsCsv}=await exported;
 const other={...b.teams[0],id:'team-b',name:'Stand privado',unit_name:'B'};
 const csv=buildStandsCsv({...b,teams:[...b.teams,other],teamGoals:[],allowedTeamIds:['team-a']});
 assert.ok(csv.includes('Stand Shopping A'));
 assert.ok(!csv.includes('Stand privado'));
 assert.ok(csv.includes('"20";"4";"1";"5";"20,0";"6";"480000,00"'));
 assert.ok(csv.includes('"";"";"";""')); // meta ausente não vira zero
});
test('v0.16: evita download enganoso quando limite de consulta é atingido',async()=>{
 const {assertCompleteLoadedReports,buildClosuresCsv}=await exported;
 assert.doesNotThrow(()=>assertCompleteLoadedReports(999));
 assert.throws(()=>assertCompleteLoadedReports(1000),/1.000 fechamentos/);
 assert.throws(()=>buildClosuresCsv({...b,reports:new Array(1000).fill(base)}),/1.000 fechamentos/);
});
test('v0.16: impede mês inválido e ausência de escopo de stand',async()=>{
 const {exportFilename,buildStandsCsv}=await exported;
 assert.equal(exportFilename('fechamentos','2026-11'),'epsa-fechamentos-2026-11.csv');
 assert.throws(()=>exportFilename('stands','2026-13'),/inválido/);
 assert.throws(()=>buildStandsCsv({...b,teamGoals:[]}),/obrigatório/);
});
test('v0.16: interface protege sessão e papéis antes de gerar CSV',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
 assert.match(app,/loadedScope!==currentScope/);
 assert.match(app,/kind==='stands'&&role==='seller'/);
 assert.match(app,/allowedTeamIds:managedTeams\.map\(x=>x\.id\)/);
 assert.match(app,/ownSellerId:role==='seller'\?user\.id:undefined/);
 assert.match(app,/URL\.revokeObjectURL/);
});
