const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261119200404_gc_admin_mfa_conditional_existing_factor_v023.sql'),'utf8');
const functions=['gc_admin_assign_seller_impl','gc_admin_create_company_impl','gc_admin_event_feed_impl','gc_admin_rename_company_impl','gc_admin_save_member_impl','gc_admin_save_team_impl'];

test('MFA administrativo: cobre todas as seis funções privadas privilegiadas',()=>{
 for(const name of functions){
  const start=sql.indexOf('CREATE OR REPLACE FUNCTION gc_private.'+name+'(');
  assert.notEqual(start,-1,name+' precisa estar na migração');
  const next=sql.indexOf('CREATE OR REPLACE FUNCTION gc_private.',start+1);
  const block=sql.slice(start,next<0?undefined:next);
  assert.match(block,/SECURITY DEFINER/);
  assert.match(block,/SET search_path TO ''/);
  assert.match(block,/SELECT 1 FROM auth\.mfa_factors f/);
  assert.match(block,/f\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(block,/f\.status = 'verified'/);
  assert.match(block,/COALESCE\(auth\.jwt\(\) ->> 'aal', ''\) <> 'aal2'/);
  assert.match(block,/USING ERRCODE = '42501'/);
  assert.match(block,/Confirme o segundo fator antes de acessar a administração/);
 }
});
test('MFA administrativo: não modifica dados, grants ou políticas RLS',()=>{
 assert.equal((sql.match(/CREATE OR REPLACE FUNCTION gc_private\.gc_admin_/g)||[]).length,6);
 assert.equal((sql.match(/auth\.mfa_factors f/g)||[]).length,6);
 assert.doesNotMatch(sql,/\bDROP\s+(TABLE|FUNCTION|POLICY)\b|\bTRUNCATE\b|\bDELETE\s+FROM\s+auth\.|\bALTER\s+POLICY\b|\bGRANT\b/);
});
