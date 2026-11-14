const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const sql=fs.readFileSync(path.join(root,'supabase/DIGITAL_HISTORY_READ_DEV_v08b.sql'),'utf8');
const ui=fs.readFileSync(path.join(root,'src/DigitalHistory.tsx'),'utf8');
const workspace=fs.readFileSync(path.join(root,'src/DigitalWorkspace.tsx'),'utf8');

test('v0.8: histórico permitido somente para conta autenticada e responsável autorizado',()=>{
 assert.match(sql,/GRANT SELECT ON public\.gc_digital_stage_events TO authenticated/);
 assert.match(sql,/FOR SELECT TO authenticated/);
 assert.match(sql,/o\.seller_id=\(SELECT auth\.uid\(\)\)/);
 assert.match(sql,/gc_private\.can_review_seller/);
 assert.match(sql,/gc_private\.is_member/);
 assert.match(sql,/o\.company_id=gc_digital_stage_events\.company_id/);
});
test('v0.8: interface não concede inserção, edição ou exclusão dos eventos',()=>{
 assert.doesNotMatch(sql,/GRANT (?:INSERT|UPDATE|DELETE)\b/i);
 assert.doesNotMatch(sql,/CREATE POLICY\s+\w+\s+ON[^;]+FOR (?:INSERT|UPDATE|DELETE)/i);
 assert.match(ui,/from\('gc_digital_stage_events'\)\s*\.select\(/);
 assert.doesNotMatch(ui,/gc_digital_stage_events'\)\.(?:insert|update|delete)/);
});
test('v0.8: histórico é consultado por oportunidade e ordenado cronologicamente',()=>{
 assert.match(ui,/\.eq\('opportunity_id',opportunityId\)/);
 assert.match(ui,/\.order\('id',\{ascending:true\}\)/);
 assert.match(ui,/Ver histórico de etapas/);
 assert.match(workspace,/DigitalHistory/);
});
