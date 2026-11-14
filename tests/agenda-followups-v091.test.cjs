const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/DigitalWorkspace.tsx'),'utf8');
const insights=fs.readFileSync(path.join(__dirname,'../src/digitalInsights.ts'),'utf8');

test('agenda inclui futuras e sem data na lista de oportunidades abertas',()=>{
 assert.match(source,/const queue=useMemo\(\(\)=>items\.filter\(o=>!\['won','lost'\]\.includes\(o\.stage\)\)/);
 assert.match(source,/const agendaItems=queue\.slice\(0,8\)/);
 assert.match(source,/agendaItems\.map\(o=>/);
 assert.doesNotMatch(source,/const duePriority=/);
});
test('agenda explica a ordem de prioridade e mostra mensagem de vazio coerente',()=>{
 assert.match(source,/Agenda por prioridade: vencidas, para hoje, futuras e sem data/);
 assert.match(source,/Nenhuma oportunidade aberta para acompanhar/);
 assert.match(source,/queue\.length>8/);
});
test('classificação cronológica mantém as futuras antes de oportunidades sem data',()=>{
 assert.match(insights,/overdue:0,today:1,scheduled:2,unscheduled:3,closed:4/);
 assert.match(insights,/\(a\.next_action_on\|\|'9999-12-31'\)\.localeCompare\(b\.next_action_on\|\|'9999-12-31'\)/);
});
