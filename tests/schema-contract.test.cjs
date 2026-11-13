const test=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sql=fs.readFileSync(path.resolve(__dirname,'../supabase/SCHEMA_DEV_REVISAR_ANTES_DE_APLICAR.sql'),'utf-8');
const tables=[...sql.matchAll(/CREATE TABLE public\.(gc_\w+)\s*\(/g)].map(x=>x[1]);
test('oito tabelas com RLS habilitada e nomes consistentes',()=>{assert.equal(tables.length,8);for(const t of tables)assert.match(sql,new RegExp('ALTER TABLE public\\.'+t+' ENABLE ROW LEVEL SECURITY;'))});
test('sem policies de escritas no cadastro administrativo',()=>{for(const name of ['gc_companies','gc_memberships','gc_teams','gc_team_members'])assert.doesNotMatch(sql,new RegExp('CREATE POLICY[^;]*ON public\\.'+name+' FOR (INSERT|UPDATE|DELETE)','i'))});
test('a criação de feedback exige guarda e há auditorias separadas',()=>{assert.match(sql,/CREATE TRIGGER gc_feedback_insert_guard/);assert.match(sql,/NEW\.acknowledged_at IS NOT NULL/);assert.match(sql,/CREATE TRIGGER gc_reports_audit/);assert.match(sql,/CREATE TRIGGER gc_feedback_audit/)});
