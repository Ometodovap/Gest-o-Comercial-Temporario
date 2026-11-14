const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const insight=import('./compiled/digitalInsights.js');
const opp=(id,sellerId,stage,next=null,lost=null)=>({
 id,seller_id:sellerId,stage,next_action_on:next,estimated_credit:250000,
 lost_reason:lost,created_at:'2026-11-13T20:00:00Z',updated_at:'2026-11-13T21:00:00Z'
});
test('v0.9: classifica agenda em vencida, hoje, futura, sem data e encerrada',async()=>{
 const d=await insight;const today='2026-11-14';
 assert.equal(d.dueStatus(opp('1','ana','contacted','2026-11-13'),today),'overdue');
 assert.equal(d.dueStatus(opp('2','ana','contacted',today),today),'today');
 assert.equal(d.dueStatus(opp('3','ana','qualified','2026-11-20'),today),'scheduled');
 assert.equal(d.dueStatus(opp('4','ana','qualified'),today),'unscheduled');
 assert.equal(d.dueStatus(opp('5','ana','won','2026-11-10'),today),'closed');
});
test('v0.9: crédito aceita 250000 e centavos, nunca negativo ou mais de 2 casas',async()=>{
 const d=await insight;
 assert.equal(d.isValidCredit(250000),true);
 assert.equal(d.isValidCredit(250000.99),true);
 assert.equal(d.isValidCredit(-1),false);
 assert.equal(d.isValidCredit(250.123),false);
 assert.equal(d.isValidCredit(Infinity),false);
});
test('v0.9: funil conta etapas alcançadas por oportunidade, sem duplicar',async()=>{
 const d=await insight;
 const rows=[opp('a','ana','proposal'),opp('b','ana','lost',null,'sem_retorno'),opp('c','bia','won')];
 const events=[
 {opportunity_id:'a',new_stage:'contacted'},{opportunity_id:'a',new_stage:'qualified'},
 {opportunity_id:'a',new_stage:'proposal'},{opportunity_id:'a',new_stage:'proposal'},
 {opportunity_id:'b',new_stage:'contacted'},{opportunity_id:'b',new_stage:'lost'},
 {opportunity_id:'c',new_stage:'won'}];
 const x=d.digitalInsights(rows,events,[], '2026-11-14');
 assert.equal(x.total,3);assert.equal(x.sellers.find(s=>s.sellerId==='ana').contacted,2);
 assert.equal(x.sellers.find(s=>s.sellerId==='ana').proposals,1);
 assert.equal(x.sellers.find(s=>s.sellerId==='ana').wins,0);
 assert.equal(x.byStage.lost,1);assert.equal(x.losses[0].code,'sem_retorno');
 assert.ok(Math.abs(x.conversion-33.333333333)<.00001);
});
test('v0.9: não presume que etapas puladas ocorreram',async()=>{
 const d=await insight;
 const x=d.digitalInsights([opp('a','ana','won')],[{opportunity_id:'a',new_stage:'won'}],[], '2026-11-14');
 assert.equal(x.sellers[0].proposals,0);assert.equal(x.sellers[0].qualified,0);
 assert.equal(x.sellers[0].wins,1);
});
test('v0.9: atividade do supervisor não infla produtividade do vendedor',async()=>{
 const d=await insight;
 const x=d.digitalInsights([opp('a','ana','contacted')],[],[
 {id:1,opportunity_id:'a',seller_id:'ana',actor_id:'marcos',action_type:'contacted'},
 {id:2,opportunity_id:'a',seller_id:'ana',actor_id:'ana',action_type:'contacted'},
 {id:3,opportunity_id:'a',seller_id:'ana',actor_id:'ana',action_type:'no_answer'},
 {id:4,opportunity_id:'other',seller_id:'ana',actor_id:'ana',action_type:'contacted'}
 ],'2026-11-14');
 assert.equal(x.sellers[0].contactsPerformed,1);
 assert.equal(x.sellers[0].unanswered,1);
 assert.equal(x.contactsPerformed,2);
 assert.equal(x.activities,3);
});
test('v0.9: vendedor com zero oportunidades não gera taxa fictícia',async()=>{
 const d=await insight;
 const x=d.digitalInsights([],[],[], '2026-11-14');
 assert.equal(x.total,0);assert.equal(x.conversion,null);assert.deepEqual(x.sellers,[]);
});
test('v0.9: prioriza oportunidades vencidas, depois hoje, futuras e sem data',async()=>{
 const d=await insight;
 const rows=[
 opp('today','a','contacted','2026-11-14'),opp('none','a','contacted'),
 opp('old','a','qualified','2026-11-10'),opp('future','a','contacted','2026-11-20')
 ];
 assert.deepEqual(rows.sort((a,b)=>d.dueSort(a,b,'2026-11-14')).map(x=>x.id),['old','today','future','none']);
});
test('v0.9: DDL mantém follow-ups imutáveis e acesso multiempresa autorizado',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../supabase/DIGITAL_FOLLOWUPS_AND_CREDIT_AUDIT_DEV_v09.sql'),'utf8');
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/g);
 assert.match(sql,/gc_digital_followups_read/);
 assert.match(sql,/gc_digital_followups_insert/);
 assert.match(sql,/gc_private\.is_member/);
 assert.match(sql,/gc_private\.can_review_seller/);
 assert.match(sql,/GRANT INSERT\(opportunity_id,action_type,next_action_on\)/);
 assert.doesNotMatch(sql,/GRANT UPDATE[^;]+gc_digital_followup_events/i);
 assert.match(sql,/gc_digital_credit_audit/);
});
test('v0.9: UI diferencia acompanhar oportunidade de registrar atividade',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../src/DigitalWorkspace.tsx'),'utf8');
 assert.match(s,/Registrar atividade comercial/);
 assert.match(s,/Salvar etapa, crédito e agenda/);
 assert.match(s,/Produtividade digital por vendedor/);
 assert.match(s,/Motivos de perda/);
 assert.match(s,/Agenda de follow-ups/);
});
