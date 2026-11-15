const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const rules=import('./compiled/mfaPolicy.js');
const app=()=>fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
const ui=()=>fs.readFileSync(path.join(__dirname,'../src/MfaSecurity.tsx'),'utf8');

test('MFA: sessão aal1 com fator verificado aal2 exige desafio',async()=>{
 const {requiresMfaChallenge}=await rules;
 assert.equal(requiresMfaChallenge('aal1','aal2'),true);
 assert.equal(requiresMfaChallenge('aal1','aal1'),false);
 assert.equal(requiresMfaChallenge('aal2','aal2'),false);
 assert.equal(requiresMfaChallenge(null,null),false);
});
test('MFA: apenas código TOTP de 6 dígitos é aceito',async()=>{
 const {isTotpCode}=await rules;
 assert.equal(isTotpCode('123456'),true);
 assert.equal(isTotpCode(' 123456 '),true);
 for(const code of ['12345','1234567','12 3456','abcdef','12345a',''])assert.equal(isTotpCode(code),false);
});
test('MFA: menu de segurança exclusivo para supervisão e diretoria',async()=>{
 const {isPrivilegedRole}=await rules;
 assert.equal(isPrivilegedRole('manager'),true);
 assert.equal(isPrivilegedRole('supervisor'),true);
 assert.equal(isPrivilegedRole('seller'),false);
 assert.match(app(),/id:'security',label:'Segurança da conta',allowed:role==='supervisor'\|\|role==='manager'/);
 assert.match(app(),/tab==='security'&&supabase&&role&&role!=='seller'/);
});
test('MFA: carregamento comercial aguarda avaliação da sessão',()=>{
 const source=app();
 assert.match(source,/mfaGate!=='ready'/);
 assert.match(source,/if\(mfaGate==='challenge'&&supabase\)return <MfaChallenge/);
 assert.match(source,/getAuthenticatorAssuranceLevel\(\)/);
 assert.match(source,/MFA_CHALLENGE_VERIFIED/);
});
test('MFA: enrolamento exige confirmação real por desafio e mantém saída do login',()=>{
 const source=ui();
 assert.match(source,/auth\.mfa\.enroll\(\{factorType:'totp'/);
 assert.match(source,/auth\.mfa\.listFactors\(\)/);
 assert.match(source,/auth\.mfa\.challenge\(\{factorId/);
 assert.match(source,/auth\.mfa\.verify\(\{factorId/);
 assert.match(source,/auth\.mfa\.unenroll\(\{factorId:pending\.id\}/);
 assert.match(source,/onLogout/);
 assert.doesNotMatch(source,/service_role|sb_secret_/);
});
