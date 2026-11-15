const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mod=import('./compiled/feedbackReview.js');

test('revisão não pode ser concluída antes da data agendada',async()=>{
 const {reviewGate}=await mod;
 const gate=reviewGate('2026-11-20','2026-11-15',true,'');
 assert.equal(gate.reviewDue,false);
 assert.equal(gate.canSubmit,false);
});
test('após a data, comparação com três dias em cada janela permite revisão',async()=>{
 const {reviewGate}=await mod;
 assert.equal(reviewGate('2026-11-20','2026-11-20',true,'').canSubmit,true);
});
test('avaliação qualitativa sem base exige observação escrita',async()=>{
 const {reviewGate}=await mod;
 assert.equal(reviewGate('2026-11-20','2026-11-21',false,'   ').canSubmit,false);
 assert.equal(reviewGate('2026-11-20','2026-11-21',false,'Treino diário observado').canSubmit,true);
});
test('interface submete a mesma regra e diferencia o acompanhamento qualitativo',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
 assert.match(s,/reviewGate\(f.review_date,todayBrazil\(\),metrics.available,notes\)/);
 assert.match(s,/if\(!gate.reviewDue\)/);
 assert.match(s,/if\(!gate.canSubmit\)/);
 assert.match(s,/Revisão agendada para/);
 assert.match(s,/Avaliação qualitativa/);
});
