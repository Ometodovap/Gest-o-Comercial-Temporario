const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'..','supabase','GOALS_MIGRATION_DEV_v06.sql'),'utf8');
test('metas: a tabela exposta exige RLS e funções de autorização',()=>{
 assert.match(sql,/alter table public\.gc_monthly_goals enable row level security/i);
 assert.match(sql,/gc_private\.can_review_seller\(company_id,seller_id\)/i);
 assert.match(sql,/gc_private\.is_member\(company_id\)/i);
 assert.match(sql,/revoke all on public\.gc_monthly_goals from public,anon,authenticated/i);
});
test('metas: trilha de auditoria sem acesso direto e imutabilidade de identidade',()=>{
 assert.match(sql,/alter table public\.gc_goal_audit enable row level security/i);
 assert.match(sql,/revoke all on public\.gc_goal_audit from public,anon,authenticated/i);
 assert.match(sql,/create function gc_private\.guard_goal_update\(\)/i);
 assert.match(sql,/grant update\(goal_atendimentos,goal_vendas,goal_cotas,goal_creditos\)/i);
});
