const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const management=import('./compiled/digitalManagement.js');

const own=(id,seller,stage,created='2026-11-01T15:00:00Z',due=null)=>({
 id,seller_id:seller,stage,created_at:created,updated_at:created,
 estimated_credit:250000,lost_reason:null,next_action_on:due
});
const stageEvent=(opportunity_id,created_at,new_stage='contacted')=>({opportunity_id,created_at,new_stage});
const followup=(opportunity_id,created_at)=>({id:123,opportunity_id,created_at,seller_id:'ana',actor_id:'marcos',action_type:'contacted',next_action_on:null});

test('v0.10: data e intervalo civil consideram fuso de Brasília',async()=>{
 const m=await management;
 assert.equal(m.brazilDay('2026-11-14T00:30:00.000Z'),'2026-11-13');
 assert.equal(m.brazilDay('2026-11-14T13:00:00Z'),'2026-11-14');
 assert.equal(m.daysSinceBrazil('2026-11-14T00:30:00Z','2026-11-14'),1);
 assert.equal(m.daysSinceBrazil('2026-11-14T15:00:00Z','2026-11-14'),0);
});

test('v0.10: sem movimentação somente após o limiar escolhido',async()=>{
 const m=await management;
 const rows=[own('a','ana','contacted','2026-11-07T15:00:00Z','2026-11-23')];
 const before=m.digitalManagementSummary(rows,[],[],'2026-11-13',7);
 const at=m.digitalManagementSummary(rows,[],[],'2026-11-14',7);
 assert.equal(before.stalled,0);
 assert.equal(at.stalled,1);
 assert.equal(at.priority[0].daysWithoutMovement,7);
 assert.equal(m.digitalManagementSummary(rows,[],[],'2026-11-14',14).stalled,0);
});

test('v0.10: histórico de etapa e atividade posterior reiniciam contagem de movimentação',async()=>{
 const m=await management;
 const rows=[own('a','ana','qualified','2026-11-01T15:00:00Z','2026-11-23')];
 assert.equal(m.digitalManagementSummary(rows,[],[],'2026-11-14',7).stalled,1);
 assert.equal(m.digitalManagementSummary(rows,[stageEvent('a','2026-11-11T12:00:00Z')],[],'2026-11-14',7).stalled,0);
 const u=m.digitalManagementSummary(rows,[stageEvent('a','2026-11-02T12:00:00Z')],[followup('a','2026-11-14T11:30:00Z')],'2026-11-14',7);
 assert.equal(u.stalled,0);
 assert.equal(u.priority.length,0);
});

test('v0.10: ignora eventos de outra oportunidade para evitar falsear alertas',async()=>{
 const m=await management;
 const rows=[own('a','ana','qualified','2026-11-01T15:00:00Z','2026-11-23')];
 const x=m.digitalManagementSummary(rows,[stageEvent('b','2026-11-14T16:00:00Z')],[followup('b','2026-11-14T15:00:00Z')],'2026-11-14',7);
 assert.equal(x.stalled,1);
 assert.equal(x.priority[0].daysWithoutMovement,13);
});

test('v0.10: oportunidades fechadas não entram nos alertas ou carteira aberta',async()=>{
 const m=await management;
 const rows=[own('a','ana','won','2026-10-01T15:00:00Z','2026-10-10'),
             own('b','ana','lost','2026-10-01T15:00:00Z',null)];
 const x=m.digitalManagementSummary(rows,[],[],'2026-11-14',7);
 assert.deepEqual([x.total,x.open,x.won,x.lost,x.stalled,x.overdue,x.unscheduled],[2,0,1,1,0,0,0]);
 assert.equal(x.sellers[0].open,0);
 assert.equal(x.priority.length,0);
});

test('v0.10: vários critérios sobre uma oportunidade geram só um alerta de carteira',async()=>{
 const m=await management;
 const rows=[own('a','ana','proposal','2026-10-20T15:00:00Z','2026-11-12'),
             own('b','ana','prospecting','2026-11-14T15:00:00Z',null),
             own('c','bia','qualified','2026-11-13T15:00:00Z','2026-11-14')];
 const x=m.digitalManagementSummary(rows,[],[],'2026-11-14',7);
 assert.equal(x.overdue,1);
 assert.equal(x.today,1);
 assert.equal(x.unscheduled,1);
 assert.equal(x.stalled,1);
 assert.equal(x.priority.length,3);
 assert.equal(x.sellers.find(s=>s.sellerId==='ana').alerts,2);
 assert.deepEqual(x.priority.map(s=>s.id),['a','c','b']);
 assert.deepEqual(x.priority[0].alerts,['overdue','stalled']);
});

test('v0.10: sem oportunidade autorizada não gera indicadores falsos',async()=>{
 const m=await management;
 const x=m.digitalManagementSummary([],[],[],'2026-11-14');
 assert.equal(x.open,0);assert.equal(x.stalled,0);assert.deepEqual(x.priority,[]);assert.deepEqual(x.sellers,[]);
});

test('v0.10: apenas supervisores e direção veem o painel gerencial digital',()=>{
 const workspace=fs.readFileSync(path.join(__dirname,'../src/DigitalWorkspace.tsx'),'utf8');
 const panel=fs.readFileSync(path.join(__dirname,'../src/DigitalManagerPanel.tsx'),'utf8');
 assert.match(workspace,/\(role==='supervisor'\|\|role==='manager'\)&&<DigitalManagerPanel/);
 assert.match(panel,/Gestão digital da equipe/);
 assert.match(panel,/Alertas para supervisão/);
 assert.match(panel,/Carteira digital por vendedor/);
 assert.match(panel,/Ausência de registro não prova ausência de atendimento/);
});

test('v0.10: falha explicitamente para limiar arbitrário e não mistura alertas',async()=>{
 const m=await management;
 assert.throws(()=>m.digitalManagementSummary([],[],[],'2026-11-14',0),/Limite de inatividade inválido/);
 assert.throws(()=>m.digitalManagementSummary([],[],[],'2026-11-14',8),/Limite de inatividade inválido/);
});
