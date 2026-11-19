const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
const mfa=fs.readFileSync(path.join(__dirname,'../src/MfaSecurity.tsx'),'utf8');
const recover=fs.readFileSync(path.join(__dirname,'../src/PasswordRecovery.tsx'),'utf8');

test('recuperação: PASSWORD_RECOVERY força nova avaliação AAL mesmo para o mesmo usuário',()=>{
 const s=app.slice(app.indexOf("if(event==='PASSWORD_RECOVERY')"),app.indexOf("if(event==='SIGNED_OUT')"));
 assert.match(s,/setRecoveryMode\(true\)/);
 assert.match(s,/setMfaGate\('checking'\)/);
 assert.match(s,/setMfaRevision\(n=>n\+1\)/);
});
test('recuperação: desafio TOTP e suas falhas precedem formulário de nova senha',()=>{
 const iChecking=app.indexOf("if(mfaGate==='checking')return");
 const iError=app.indexOf("if(mfaGate==='error')return");
 const iChallenge=app.indexOf("if(mfaGate==='challenge'&&supabase)return");
 const iRecovery=app.indexOf("if(recoveryMode&&supabase)return <SetRecoveredPassword");
 assert.ok(iChecking>0&&iError>iChecking&&iChallenge>iError&&iRecovery>iChallenge);
 assert.match(app,/purpose=\{recoveryMode\?'recovery':'login'\}/);
 assert.match(app,/onVerified=\{\(\)=>setMfaRevision\(n=>n\+1\)\}/);
});
test('recuperação: segundo fator real eleva sessão antes da troca de senha',()=>{
 assert.match(app,/auth\.mfa\.getAuthenticatorAssuranceLevel\(\)/);
 assert.match(mfa,/auth\.mfa\.challenge\(\{factorId\}/);
 assert.match(mfa,/auth\.mfa\.verify\(\{factorId,challengeId:challenge\.data\.id,code:code\.trim\(\)\}\)/);
 assert.match(mfa,/purpose==='recovery'/);
 assert.match(mfa,/Para definir uma nova senha/);
 assert.match(recover,/client\.auth\.updateUser\(\{password\}\)/);
});
test('recuperação: não remove MFA nem altera senha automaticamente',()=>{
 assert.doesNotMatch(app,/admin\.updateUserById|supabase\.auth\.admin/);
 assert.doesNotMatch(recover,/auth\.mfa\.unenroll|auth\.admin|service_role/);
 assert.match(recover,/async function updatePassword\(event:FormEvent\)/);
 assert.match(recover,/onSubmit=\{updatePassword\}/);
});
