const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const edge=fs.readFileSync(path.join(__dirname,'../supabase/functions/gc-invite-user/index.ts'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/INVITE_HISTORY_V014.sql'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../src/AdminWorkspace.tsx'),'utf8');

test('v0.14: Auth Admin é chamado somente na Edge Function do servidor',()=>{
 assert.match(edge,/admin\.auth\.admin\.inviteUserByEmail\(/);
 assert.doesNotMatch(ui,/auth\.admin\.|SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS/);
 assert.match(ui,/client\.functions\.invoke\('gc-invite-user'/);
});
test('v0.14: envio depende de três configurações de servidor',()=>{
 assert.match(edge,/GC_INVITES_ENABLED/);
 assert.match(edge,/GC_MAIL_READY/);
 assert.match(edge,/GC_INVITE_REDIRECT_URL/);
 assert.match(edge,/if \(!enabled\) return respond\(origin, 409,/);
 assert.match(edge,/u\.hostname === projectDomain/);
 assert.match(edge,/redirectTo: Deno\.env\.get\("GC_INVITE_REDIRECT_URL"\)!/);
});
test('v0.14: identifica usuário via Auth e busca manager ativo por empresa',()=>{
 assert.match(edge,/admin\.auth\.getUser\(match\[1\]\)/);
 assert.match(edge,/\.eq\("company_id", companyId\)\.eq\("user_id", actorId\)/);
 assert.match(edge,/\.eq\("role", "manager"\)\.eq\("active", true\)/);
 assert.doesNotMatch(edge,/userInfo\.user\.(?:user_metadata|app_metadata)/);
 assert.match(edge,/if \(!manager\) return respond\(origin, 403,/);
});
test('v0.14: prévia não envia e-mail, não cria Auth nem grava log',()=>{
 const preview=edge.slice(edge.indexOf('if (action === "preview")'),edge.indexOf('if (!enabled) return'));
 assert.match(preview,/valid: true/);
 assert.match(preview,/sending_enabled: enabled/);
 assert.doesNotMatch(preview,/inviteUserByEmail|\.insert\(|\.update\(/);
 assert.match(ui,/action:'preview'/);
});
test('v0.14: servidor protege duplicidade, limites e auditoria',()=>{
 assert.match(edge,/maxPerManager24h = 10/);
 assert.match(edge,/status: "processing"/);
 assert.match(edge,/if \(duplicate\) return respond\(origin, 409,/);
 assert.match(edge,/await mark\("link_pending"/);
 assert.match(edge,/actingClient\.rpc\("gc_admin_save_member"/);
 assert.match(edge,/Somente a Diretoria ativa desta empresa/);
});
test('v0.14: nova tabela não é consultável ou editável por usuários comuns',()=>{
 assert.match(sql,/ALTER TABLE public\.gc_invite_history ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.gc_invite_history FROM PUBLIC, anon, authenticated/);
 assert.match(sql,/GRANT SELECT, INSERT, UPDATE ON TABLE public\.gc_invite_history TO service_role/);
 assert.match(sql,/CREATE UNIQUE INDEX gc_invite_one_active_email_per_company/);
 assert.doesNotMatch(sql,/CREATE POLICY .* ON public\.gc_invite_history/);
});
test('v0.14: interface exige prévia e confirmação explícita antes de enviar',()=>{
 assert.match(ui,/Pré-validar convite/);
 assert.match(ui,/invitePreview\?\.sending_enabled/);
 assert.match(ui,/window\.confirm\(/);
 assert.match(ui,/disabled=\{busy\|\|!invitePreview\.sending_enabled\|\|invitePreview\.already_invited\}/);
 assert.match(ui,/setInvitePreview\(null\)/);
});
