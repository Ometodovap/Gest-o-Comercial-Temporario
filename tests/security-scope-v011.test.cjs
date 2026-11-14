const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const scope=import('./compiled/securityScope.js');

test('v0.11: escopo exige usuário, empresa e mês',async()=>{
 const {scopeKey}=await scope;
 assert.equal(scopeKey('seller','company-a','2026-11'),'seller|company-a|2026-11');
 assert.equal(scopeKey(undefined,'company-a','2026-11'),'');
 assert.equal(scopeKey('seller','','2026-11'),'');
 assert.notEqual(scopeKey('seller','company-a','2026-11'),scopeKey('seller','company-b','2026-11'));
 assert.notEqual(scopeKey('seller','company-a','2026-11'),scopeKey('other','company-a','2026-11'));
 assert.notEqual(scopeKey('seller','company-a','2026-11'),scopeKey('seller','company-a','2026-12'));
});
test('v0.11: resposta antiga não substitui consulta mais recente',async()=>{
 const {createScopeGuard}=await scope;
 const gate=createScopeGuard();
 const old=gate.begin('seller|company-a|2026-11');
 const latest=gate.begin('seller|company-a|2026-11');
 assert.equal(gate.isCurrent(old,'seller|company-a|2026-11'),false);
 assert.equal(gate.isCurrent(latest,'seller|company-a|2026-11'),true);
});
test('v0.11: troca de empresa bloqueia resposta pendente da empresa anterior',async()=>{
 const {createScopeGuard}=await scope;
 const gate=createScopeGuard();
 const old=gate.begin('seller|company-a|2026-11');
 assert.equal(gate.isCurrent(old,'seller|company-b|2026-11'),false);
 gate.invalidate();
 assert.equal(gate.isCurrent(old,'seller|company-a|2026-11'),false);
 const newRequest=gate.begin('seller|company-b|2026-11');
 assert.equal(gate.isCurrent(newRequest,'seller|company-b|2026-11'),true);
});
test('v0.11: logout revoga todas as consultas anteriores',async()=>{
 const {createScopeGuard}=await scope;
 const gate=createScopeGuard();
 const req=gate.begin('seller|company-a|2026-11');
 gate.invalidate();
 assert.equal(gate.isCurrent(req,'seller|company-a|2026-11'),false);
});
test('v0.11: frontend oculta dados até confirmar o escopo autorizado',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
 assert.match(app,/loadedScope!==currentScope/);
 assert.match(app,/loadGate\.current\.isCurrent\(ticket,liveScope\.current\)/);
 assert.match(app,/scopeKey\(user\?\.id,companyId,periodMonth\)/);
 assert.match(app,/setLoadedScope\(requestScope\)/);
 assert.match(app,/loadGate\.current\.invalidate\(\);setLoadedScope\(''\);setCompanyId/);
});
test('v0.11: autenticação não encerra escopo por mera renovação de token',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
 assert.match(app,/if\(nextId!==authUserId\.current\)/);
 assert.match(app,/authUserId\.current=nextId/);
});
test('v0.11: segurança dos cabeçalhos estáticos Cloudflare Pages',()=>{
 const h=fs.readFileSync(path.join(__dirname,'../public/_headers'),'utf8');
 assert.match(h,/X-Content-Type-Options: nosniff/);
 assert.match(h,/X-Frame-Options: DENY/);
 assert.match(h,/Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'/);
 assert.match(h,/Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
});
test('v0.11: variáveis privadas continuam fora do Git e chave só é publishable',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
 const ignore=fs.readFileSync(path.join(__dirname,'../.gitignore'),'utf8');
 assert.match(ignore,/^\.env$/m);
 assert.match(ignore,/^\.env\.\*$/m);
 assert.match(app,/import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY/);
 assert.doesNotMatch(app,/import\.meta\.env\.VITE_.*(?:SERVICE_ROLE|SECRET)/);
});
