const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/ADMIN_FOUNDATION_V013.sql'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
const admin=fs.readFileSync(path.join(__dirname,'../src/AdminWorkspace.tsx'),'utf8');
test('v0.13: administração visível somente à supervisão ou diretoria',()=>{
 assert.match(app,/\{id:'admin',label:'Administração',allowed:role==='supervisor'\|\|role==='manager'\}/);
 assert.match(app,/tab==='admin'.*role!=='seller'.*<AdminWorkspace/);
 assert.match(admin,/const canEdit=role==='manager'/);
 assert.match(admin,/Somente a diretoria|Operação reservada à diretoria/);
});
test('v0.13: CRUD exposto por wrappers SECURITY INVOKER; corpos privados',()=>{
 for(const fn of ['gc_admin_create_company','gc_admin_rename_company','gc_admin_save_member','gc_admin_save_team','gc_admin_assign_seller']){
  assert.match(sql,new RegExp('CREATE OR REPLACE FUNCTION public\\.'+fn+'\\('));
  assert.match(sql,new RegExp('CREATE OR REPLACE FUNCTION gc_private\\.'+fn+'_impl\\('));
 }
 assert.equal((sql.match(/LANGUAGE sql SECURITY INVOKER SET search_path=''/g)||[]).length,5);
 assert.equal((sql.match(/LANGUAGE plpgsql SECURITY DEFINER SET search_path=''/g)||[]).length,5);
 assert.match(sql,/FROM PUBLIC,anon/);
 assert.match(sql,/TO authenticated/);
});
test('v0.13: permissões conferem diretoria ativa no banco e impedem escalação',()=>{
 assert.match(sql,/role='manager' AND active/);
 assert.match(sql,/p_role NOT IN \('seller','supervisor'\)/);
 assert.match(sql,/v_prior='manager'/);
 assert.match(sql,/p_user_id=v_uid/);
 assert.match(sql,/company_id<>p_company_id AND active/);
 assert.match(sql,/Reatribua os stands/);
});
test('v0.13: funções não permitem escrever ou consultar empresa alheia',()=>{
 assert.match(sql,/WHERE company_id=p_company_id AND id=p_team_id/);
 assert.match(sql,/WHERE company_id=p_company_id AND user_id=p_seller_id AND role='seller' AND active FOR UPDATE/);
 assert.match(sql,/team_id<>p_team_id AND active/);
 assert.match(sql,/ON CONFLICT\(company_id,team_id,seller_id\) DO UPDATE/);
});
test('v0.13: auditoria fica fora da API com RLS e sem acessos de usuários',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS gc_private\.gc_admin_audit/);
 assert.match(sql,/ALTER TABLE gc_private\.gc_admin_audit ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON gc_private\.gc_admin_audit FROM PUBLIC, anon, authenticated/);
 for(const a of ['create_company','rename_company','save_member','save_team','assign_seller'])assert.ok(sql.includes("'"+a+"'"));
});
test('v0.13: não há senha ou service role no painel',()=>{
 assert.match(admin,/client\.rpc\(/);
 assert.doesNotMatch(admin,/service_role|secret_key|SUPABASE_SECRET/i);
 assert.doesNotMatch(admin,/auth\.admin\./);
 assert.match(admin,/UID da conta no Auth/);
 assert.match(admin,/role==='manager'/);
 assert.match(admin,/Não é permitido anexar usuários ativos de outra empresa/);
});
test('v0.13: confirmação de troca de equipe preserva relatórios históricos',()=>{
 assert.match(admin,/O histórico não foi reescrito/);
 assert.doesNotMatch(sql,/(?:UPDATE|DELETE FROM) public\.gc_daily_reports/i);
});
