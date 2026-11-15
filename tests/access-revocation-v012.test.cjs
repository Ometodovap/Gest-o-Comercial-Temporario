const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const membership=import('./compiled/accessMembership.js');
const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261114212547_gc_secure_default_privileges_v012.sql'),'utf8');

const mk=(company,role,user='ana',active=true)=>({
 company_id:company,user_id:user,role,active,display_name:'Teste'
});
test('v0.12: impressão digital de vínculos ignora inativos e a ordem de retorno',async()=>{
 const {activeMembershipFingerprint}=await membership;
 assert.equal(activeMembershipFingerprint([mk('b','seller'),mk('a','supervisor')]),
  activeMembershipFingerprint([mk('a','supervisor'),mk('b','seller')]));
 assert.equal(activeMembershipFingerprint([mk('a','seller', 'ana',false)]),'');
});
test('v0.12: mudança de papel ou empresa invalida o contexto de autorização',async()=>{
 const {activeMembershipFingerprint}=await membership;
 const prior=activeMembershipFingerprint([mk('a','supervisor')]);
 assert.notEqual(prior,activeMembershipFingerprint([mk('a','seller')]));
 assert.notEqual(prior,activeMembershipFingerprint([mk('b','supervisor')]));
 assert.notEqual(prior,activeMembershipFingerprint([mk('a','supervisor','marcos')]));
});
test('v0.12: revogação total não reusa papel nem empresa anterior',()=>{
 assert.match(app,/setMemberships\(\[\]\);setCompanyId\(''\);setCompanyChoices\(\{\}\)/);
 assert.match(app,/membershipFingerprint\.current=''/);
 assert.match(app,/m\.user_id===user\?\.id&&m\.active/);
});
test('v0.12: revalidação no retorno à janela e ao tornar a aba visível',()=>{
 assert.match(app,/window\.addEventListener\('focus',onFocus\)/);
 assert.match(app,/document\.addEventListener\('visibilitychange',onVisible\)/);
 assert.match(app,/document\.visibilityState==='visible'/);
 assert.match(app,/window\.removeEventListener\('focus',onFocus\)/);
 assert.match(app,/document\.removeEventListener\('visibilitychange',onVisible\)/);
});
test('v0.12: revalidação é associada ao usuário atual e descarta respostas antigas',()=>{
 assert.match(app,/authUserId\.current!==userId/);
 assert.match(app,/current!==requestNumber/);
 assert.match(app,/loadGate\.current\.invalidate\(\)/);
 assert.match(app,/setLoadedScope\(''\)/);
 assert.match(app,/setMembershipRevision\(n=>n\+1\)/);
 assert.match(app,/membershipRevision\]\)/);
});
test('v0.12: erro de consulta impede uso de vínculos em cache',()=>{
 assert.match(app,/const revokeCachedAccess=[\s\S]*?setMemberships\(\[\]\);setCompanyId\(''\);setCompanyChoices\(\{\}\)/);
 assert.match(app,/if\(error\)\{\s*revokeCachedAccess\(/);
 assert.match(app,/Não foi possível verificar seu acesso/);
});
test('v0.12: migração restringe futuros objetos no esquema público sem modificar existentes',()=>{
 assert.match(migration,/ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE ALL ON TABLES FROM anon, authenticated, service_role/i);
 assert.match(migration,/REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role/i);
 assert.match(migration,/REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role/i);
 assert.match(migration,/ALTER DEFAULT PRIVILEGES FOR ROLE postgres\s+REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC/i);
 assert.doesNotMatch(migration,/ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin/i);
 assert.doesNotMatch(migration,/DROP TABLE|DELETE FROM|TRUNCATE TABLE|REVOKE .* ON ALL TABLES IN SCHEMA/i);
});
