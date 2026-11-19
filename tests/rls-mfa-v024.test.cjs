const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../docs/sql/rls_mfa_conditional_v024.sql'),'utf8');
const tables=["gc_coaching_feedback","gc_companies","gc_daily_reports","gc_digital_followup_events","gc_digital_opportunities","gc_digital_stage_events","gc_memberships","gc_monthly_goals","gc_team_members","gc_team_monthly_goals","gc_teams"];
test('MFA RLS: exatamente 11 tabelas comerciais com policy restritiva',()=>{
 assert.equal((source.match(/CREATE POLICY gc_mfa_existing_factor_gate/g)||[]).length,11);
 for(const t of tables){
  const re=new RegExp('CREATE POLICY gc_mfa_existing_factor_gate\\s+ON public\\.'+t+'\\s+AS RESTRICTIVE FOR ALL TO authenticated');
  assert.match(source,re,t);
 }
 assert.doesNotMatch(source,/ON public\.gc_\w+_audit\s|ON public\.gc_invite_history\s/);
});
test('MFA RLS: exige aal2 somente quando houver fator verificado',()=>{
 assert.match(source,/auth\.jwt\(\) ->> 'aal'/);
 assert.match(source,/f\.status = 'verified'/);
 assert.match(source,/NOT EXISTS\(/);
 assert.match(source,/f\.user_id = \(SELECT auth\.uid\(\)\)/);
 assert.match(source,/SECURITY DEFINER/);
 assert.match(source,/SET search_path TO ''/);
 assert.match(source,/REVOKE ALL ON FUNCTION/);
 assert.match(source,/TO authenticated/);
 assert.doesNotMatch(source,/ALTER POLICY|ALTER ROLE|DROP POLICY|\bINSERT INTO\b|\bDELETE FROM\b/);
});
