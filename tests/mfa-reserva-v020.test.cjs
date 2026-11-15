const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const policy=import('./compiled/mfaPolicy.js');
const ui=fs.readFileSync(path.join(__dirname,'../src/MfaSecurity.tsx'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');

test('backup: só permite testar um dos dois fatores verificados',async()=>{
 const {canTestBackup}=await policy;
 const one=[{id:'principal',status:'verified'}];
 const both=[...one,{id:'reserva',status:'verified'}];
 const unverified=[...one,{id:'pendente',status:'unverified'}];
 assert.equal(canTestBackup(one,'principal','123456'),false);
 assert.equal(canTestBackup(unverified,'pendente','123456'),false);
 assert.equal(canTestBackup(both,'pendente','123456'),false);
 assert.equal(canTestBackup(both,'reserva','12345'),false);
 assert.equal(canTestBackup(both,'reserva','123456'),true);
 assert.equal(canTestBackup(both,'principal','000000'),true);
 assert.equal(canTestBackup([], 'reserva','123456'),false);
});
test('backup: dispositivo de reserva exige desafio e verificação pelo Supabase',()=>{
 assert.match(ui,/async function verifyBackup\(event:FormEvent\)/);
 assert.match(ui,/canTestBackup\(factors,backupFactorId,backupCode\)/);
 assert.match(ui,/auth\.mfa\.getAuthenticatorAssuranceLevel\(\)/);
 assert.match(ui,/assurance\.data\.currentLevel!=='aal2'/);
 assert.match(ui,/auth\.mfa\.challenge\(\{factorId:backupFactorId\}\)/);
 assert.match(ui,/auth\.mfa\.verify\(\{factorId:backupFactorId/);
 assert.match(ui,/factors\.length>=2&&!pending/);
 assert.match(ui,/em um dispositivo independente/);
 assert.doesNotMatch(ui,/auth\.admin|service_role|sb_secret_/);
});
test('backup: teste de segundo fator não desmonta o painel já aal2',()=>{
 assert.match(app,/mfaGateRef\.current!=='ready'/);
 assert.match(app,/event==='MFA_CHALLENGE_VERIFIED'/);
});
