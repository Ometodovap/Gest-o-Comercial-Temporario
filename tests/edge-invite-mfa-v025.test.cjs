const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../supabase/functions/gc-invite-user/index.ts'),'utf8');

test('Edge convites: JWT do usuário consulta RPC de auditoria antes de usar service_role',()=>{
 const auth=src.indexOf('admin.auth.getUser(match[1])');
 const rpc=src.indexOf('actingClient.rpc("gc_admin_event_feed"');
 const member=src.indexOf('admin.from("gc_memberships")');
 const history=src.indexOf('admin.from("gc_invite_history")');
 const send=src.indexOf('admin.auth.admin.inviteUserByEmail(');
 assert.ok(auth>=0&&rpc>auth&&member>rpc&&history>rpc&&send>rpc, 'preflight precisa ocorrer antes das consultas/escritas privilegiadas');
 assert.match(src,/global: \{ headers: \{ Authorization: jwtHeader \} \}/);
 assert.match(src,/p_company_id: companyId/);
 assert.match(src,/p_limit: 1/);
 assert.match(src,/if \(accessError\) \{\s*return respond\(origin, 403/);
});
test('Edge convites: sem alteração de flags, validação por papel e chave secreta restrita ao servidor',()=>{
 assert.match(src,/GC_INVITES_ENABLED/);
 assert.match(src,/GC_MAIL_READY/);
 assert.match(src,/if \(!enabled\) return respond\(origin, 409/);
 assert.match(src,/manager\) return respond\(origin, 403/);
 assert.match(src,/const admin = createClient\(projectUrl, secret/);
 assert.doesNotMatch(src,/console\.(log|error)\([^)]*(jwtHeader|match\[1\]|secret)/);
 assert.equal((src.match(/const actingClient/g)||[]).length,1);
});
