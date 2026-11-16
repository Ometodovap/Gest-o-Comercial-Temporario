const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/PilotEmailChange.tsx'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');

test('troca de email: e-mail solicitado exatamente para a Diretoria Piloto A',()=>{
 assert.match(source,/const FROM='diretoria@piloto\.test'/);
 assert.match(source,/const TARGET='contato\.gvs\.diretoria@gmail\.com'/);
 assert.match(source,/currentEmail\?\.toLowerCase\(\)===FROM/);
 assert.match(source,/current\.data\.user\.email\?\.toLowerCase\(\)!==FROM/);
});
test('troca de email: exige sessão aal2 e API auth.updateUser, não atualiza auth.users por SQL',()=>{
 assert.match(source,/auth\.mfa\.getAuthenticatorAssuranceLevel\(\)/);
 assert.match(source,/currentLevel!=='aal2'/);
 assert.match(source,/auth\.updateUser\(\{email:TARGET\},\{emailRedirectTo:/);
 assert.doesNotMatch(source,/service_role|auth\.admin|UPDATE auth\.users|supabase\.from\('users'/);
});
test('troca de email: somente perfil de diretoria recebe ação',()=>{
 assert.match(app,/role==='manager'&&<PilotEmailChange/);
 assert.match(app,/tab==='security'&&supabase&&role&&role!=='seller'/);
});
