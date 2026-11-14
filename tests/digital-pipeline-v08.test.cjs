const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const pipe=import('./compiled/digitalPipeline.js');
test('v0.8: etapas digitais são distintas de fechamento presencial',async()=>{const m=await pipe;assert.deepEqual(m.digitalStages.map(s=>s.value),['prospecting','contacted','qualified','proposal','negotiation','won','lost']);});
test('v0.8: a oportunidade pode avançar ou ser perdida',async()=>{const m=await pipe;assert.equal(m.validDigitalTransition('prospecting','contacted'),true);assert.equal(m.validDigitalTransition('proposal','won'),true);assert.equal(m.validDigitalTransition('qualified','lost'),true);});
test('v0.8: proíbe retorno a etapa anterior e reabertura',async()=>{const m=await pipe;assert.equal(m.validDigitalTransition('proposal','qualified'),false);assert.equal(m.validDigitalTransition('lost','qualified'),false);assert.equal(m.validDigitalTransition('won','proposal'),false);});
test('v0.8: conversão digital não divide por zero nem aceita contagens inválidas',async()=>{const m=await pipe;assert.equal(m.digitalConversion(20,5),25);assert.equal(m.digitalConversion(0,0),null);assert.equal(m.digitalConversion(3,8),null);});
test('v0.8: schema exige isolamento multiempresa, auditoria e campos sem PII',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../supabase/DIGITAL_PIPELINE_MIGRATION_DEV_v08.sql'),'utf8');
 assert.match(s,/ENABLE ROW LEVEL SECURITY/g);assert.match(s,/gc_digital_read/);assert.match(s,/gc_digital_insert/);
 assert.match(s,/gc_digital_update/);assert.match(s,/gc_digital_stage_events/);assert.match(s,/gc_private.is_member/);
 assert.doesNotMatch(s,/client_(?:name|email|phone)|customer_(?:name|email|phone)/i);
});
test('v0.8: oportunidades terminais imutáveis e origem protegida',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../supabase/DIGITAL_PIPELINE_MIGRATION_DEV_v08.sql'),'utf8');
 assert.match(s,/OLD.stage IN \('won','lost'\).*Oportunidade encerrada/);
 assert.match(s,/Identidade e origem da oportunidade não podem ser alteradas/);
 assert.match(s,/GRANT UPDATE\(stage,estimated_credit,next_action_on,lost_reason\)/);
});
