const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
const start=app.indexOf(" useEffect(()=>{\n  if(!user||!supabase){");
const end=app.indexOf(" const loadData=useCallback",start);
const access=app.slice(start,end);
test('v0.15.1: voltar à aba não invalida os dados antes de verificar mudança de acesso',()=>{
 assert.ok(start>=0&&end>start,'hook de validação identificado');
 const preflight=access.slice(access.indexOf('const verifyAccess=async()=>{'),access.indexOf('const revokeCachedAccess='));
 assert.doesNotMatch(preflight,/loadGate\.current\.invalidate|setLoadedScope\(''\)|setMembershipRevision/);
 assert.match(preflight,/if\(revalidationInFlight\|\|Date\.now\(\)-lastVerificationAt<1200\)return/);
});
test('v0.15.1: acesso inalterado preserva escopo, página e os dados do mês',()=>{
 const unchanged=access.split('}else{\n     // Nome atualizado')[1];
 assert.ok(unchanged,'ramo de acesso inalterado presente');
 const branch=unchanged.split('   }catch(')[0];
 assert.doesNotMatch(branch,/setTab\(|setLoadedScope\(|setMembershipRevision\(|loadGate\.current\.invalidate/);
 assert.match(branch,/setMemberships\(prev=>JSON\.stringify\(prev\)===JSON\.stringify\(ms\)\?prev:ms\)/);
});
test('v0.15.1: alterações reais e falha de autorização continuam limpando o contexto',()=>{
 assert.match(access,/if\(accessChanged\)\{[\s\S]*?loadGate\.current\.invalidate\(\);setLoadedScope\(''\);/);
 assert.match(access,/setMembershipRevision\(n=>n\+1\)/);
 assert.match(access,/const revokeCachedAccess=[\s\S]*?setMemberships\(\[\]\);setCompanyId\(''\);setCompanyChoices\(\{\}\);/);
 assert.match(access,/if\(error\)\{\s*revokeCachedAccess/);
 assert.match(access,/catch\(e\)\{[\s\S]*?revokeCachedAccess/);
});
test('v0.15.1: revalidação é deduplicada e listeners removidos no cleanup',()=>{
 assert.match(access,/revalidationInFlight=true/);
 assert.match(access,/finally\{[\s\S]*?revalidationInFlight=false/);
 assert.match(access,/addEventListener\('focus',onFocus\)/);
 assert.match(access,/addEventListener\('visibilitychange',onVisible\)/);
 assert.match(access,/removeEventListener\('focus',onFocus\)/);
 assert.match(access,/removeEventListener\('visibilitychange',onVisible\)/);
});
