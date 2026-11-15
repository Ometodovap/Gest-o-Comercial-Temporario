const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
const recovery=fs.readFileSync(path.join(__dirname,'../src/PasswordRecovery.tsx'),'utf8');
const mfa=fs.readFileSync(path.join(__dirname,'../src/MfaSecurity.tsx'),'utf8');

test('senha por email: solicitação ao Supabase e retorno seguro à aplicação',()=>{
 assert.match(recovery,/auth\.resetPasswordForEmail\(email\.trim\(\),\{redirectTo:RECOVERY_REDIRECT\}\)/);
 assert.match(recovery,/https:\/\/gest-o-comercial-temporario\.pages\.dev\//);
 assert.match(recovery,/Se este e-mail estiver cadastrado/);
 assert.doesNotMatch(recovery,/service_role|sb_secret_/);
});
test('senha por email: recuperação pelo evento real e não por link arbitrário',()=>{
 assert.match(app,/event==='PASSWORD_RECOVERY'/);
 assert.match(app,/if\(recoveryMode&&supabase\)return <SetRecoveredPassword/);
 assert.match(recovery,/auth\.updateUser\(\{password\}\)/);
 assert.match(recovery,/password\.length<8/);
 assert.match(recovery,/password!==confirmation/);
 assert.match(app,/async function completeRecovery\(\)/);
 assert.match(app,/supabase\.auth\.signOut\(\)/);
});
test('senha por email: login oferece Esqueci minha senha',()=>{
 assert.match(app,/Esqueci minha senha/);
 assert.match(app,/if\(resetRequestOpen&&supabase\)return <ForgotPassword/);
 assert.match(recovery,/autoComplete="email"/);
});
test('MFA: sem exigência ou pressão para autenticador de reserva',()=>{
 assert.doesNotMatch(mfa,/Cadastrar autenticador de reserva|Testar autenticador de reserva|apenas um autenticador verificado|canTestBackup/);
 assert.match(mfa,/Autenticação em duas etapas ativada nesta conta/);
 assert.match(mfa,/Configurar autenticador \(opcional\)/);
 assert.match(mfa,/auth\.mfa\.challenge\(\{factorId/);
 assert.match(mfa,/auth\.mfa\.verify\(\{factorId/);
 assert.match(app,/requiresMfaChallenge/);
});
