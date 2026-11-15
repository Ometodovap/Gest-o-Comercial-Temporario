const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/ADMIN_EVENT_FEED_V015.sql'),'utf8');
const admin=fs.readFileSync(path.join(__dirname,'../src/AdminWorkspace.tsx'),'utf8');
const feed=fs.readFileSync(path.join(__dirname,'../src/AdminAudit.tsx'),'utf8');

test('v0.15: somente diretoria ativa pode ler eventos da própria empresa',()=>{
 assert.match(sql,/m\.company_id = p_company_id/);
 assert.match(sql,/m\.user_id = auth\.uid\(\)/);
 assert.match(sql,/m\.role = 'manager'/);
 assert.match(sql,/m\.active = true/);
 assert.match(sql,/WHERE a\.company_id = p_company_id/);
 assert.match(sql,/p_limit > 50/);
});
test('v0.15: impl privada e RPC pública invoker sem abrir tabela de auditoria',()=>{
 assert.match(sql,/FUNCTION gc_private\.gc_admin_event_feed_impl/);
 assert.match(sql,/LANGUAGE plpgsql STABLE SECURITY DEFINER/);
 assert.match(sql,/FUNCTION public\.gc_admin_event_feed/);
 assert.match(sql,/LANGUAGE sql STABLE SECURITY INVOKER/);
 assert.match(sql,/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/);
 assert.match(sql,/TO authenticated/);
 assert.doesNotMatch(sql,/GRANT SELECT ON gc_private\.gc_admin_audit/);
});
test('v0.15: somente campos seguros, sem dados JSON, tokens ou UID no feed',()=>{
 const attrs=sql.slice(sql.indexOf('RETURNS TABLE('),sql.indexOf('LANGUAGE plpgsql'));
 for(const x of ['event_id bigint','happened_at timestamptz','action text','actor_name text','target_name text'])assert.ok(attrs.includes(x),x);
 assert.doesNotMatch(attrs,/details|actor_user_id|target_email|jwt|password/);
 assert.doesNotMatch(sql,/a\.details/);
 assert.match(sql,/a\.occurred_at DESC, a\.id DESC/);
});
test('v0.15: acesso ao histórico pelo manager e nunca pelo supervisor',()=>{
 assert.match(admin,/\{canEdit&&<AdminAudit client=\{client\} companyId=\{companyId\} refreshVersion=\{auditRefresh\}\/>\}/);
 assert.match(admin,/const canEdit=role==='manager'/);
 assert.doesNotMatch(feed,/service_role|SUPABASE_SERVICE_ROLE|auth\.admin/);
});
test('v0.15: refaz leitura após atualização e limpa dados ao trocar empresa',()=>{
 assert.match(feed,/setRows\(\[\]\)/);
 assert.match(feed,/client\.rpc\('gc_admin_event_feed'/);
 assert.match(feed,/\[client,companyId,refreshVersion,requestVersion\]/);
 assert.match(feed,/return\(\)=>\{current=false\}/);
 assert.match(admin,/setAuditRefresh\(x=>x\+1\)/);
});
test('v0.15: estados de carregamento, vazio e erro e limitador',()=>{
 assert.match(feed,/p_limit:30/);
 assert.match(feed,/role="status"/);
 assert.match(feed,/role="alert"/);
 assert.match(feed,/Ainda não existem alterações administrativas/);
 assert.match(feed,/Horário de Brasília/);
});
