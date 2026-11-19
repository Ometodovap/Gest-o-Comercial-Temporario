// EPSA Gestão Comercial v0.14 — convite Auth exclusivamente pelo servidor.
// Padrão seguro: envio desativado até configurar GC_INVITES_ENABLED e GC_MAIL_READY.
// Nenhuma service_role, senha, link de convite ou token retorna ao navegador.
import { createClient } from "npm:@supabase/supabase-js@2.108.1";

type InviteBody = {
  action?: "preview" | "send";
  company_id?: string;
  email?: string;
  display_name?: string;
  role?: "seller" | "supervisor";
};
type InvitationRecord = { id: string; status: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const projectDomain = "gest-o-comercial-temporario.pages.dev";
const maxPerManager24h = 10;

function allowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // calls without a browser Origin still require a valid user JWT
  try {
    const u = new URL(origin);
    if (u.origin !== origin) return false;
    if (u.protocol === "https:" &&
      (u.hostname === projectDomain || u.hostname.endsWith("." + projectDomain))) return true;
    return u.protocol === "http:" && u.hostname === "localhost" &&
      (u.port === "5173" || u.port === "5174");
  } catch { return false; }
}
function cors(origin: string | null): HeadersInit {
  const headers: Record<string,string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "vary": "Origin",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
    "access-control-allow-methods": "POST, OPTIONS",
    "x-content-type-options": "nosniff",
  };
  if (origin && allowedOrigin(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}
function respond(origin: string | null, code: number, body: Record<string,unknown>): Response {
  return new Response(JSON.stringify(body), { status: code, headers: cors(origin) });
}
function sendingEnabled(): boolean {
  const redirect = Deno.env.get("GC_INVITE_REDIRECT_URL") || "";
  if (Deno.env.get("GC_INVITES_ENABLED") !== "true" ||
      Deno.env.get("GC_MAIL_READY") !== "true") return false;
  try {
    const u = new URL(redirect);
    return u.protocol === "https:" && u.hostname === projectDomain &&
      (u.pathname === "/" || u.pathname === "");
  } catch { return false; }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  if (!allowedOrigin(origin)) return respond(null, 403, { error: "Origem não autorizada." });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return respond(origin, 405, { error: "Método não permitido." });

  const jwtHeader = req.headers.get("authorization") || "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(jwtHeader);
  if (!match) return respond(origin, 401, { error: "Sessão necessária." });

  const projectUrl = Deno.env.get("SUPABASE_URL") || "";
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!projectUrl || !secret || !publicKey) {
    return respond(origin, 503, { error: "Configuração de autenticação indisponível." });
  }
  const admin = createClient(projectUrl, secret, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  // getUser() consulta o servidor de Auth; nunca confiamos em user_metadata ou UID enviado pelo cliente.
  const { data: userInfo, error: tokenError } = await admin.auth.getUser(match[1]);
  if (tokenError || !userInfo.user) return respond(origin, 401, { error: "Sessão inválida." });
  const actorId = userInfo.user.id;

  let body: InviteBody;
  try {
    const raw = await req.text();
    if (raw.length > 2048) return respond(origin, 413, { error: "Formulário muito extenso." });
    body = JSON.parse(raw) as InviteBody;
  } catch { return respond(origin, 400, { error: "Dados inválidos." }); }
  const companyId = typeof body.company_id === "string" ? body.company_id : "";
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const name = typeof body.display_name === "string" ? body.display_name.trim() : "";
  const role = body.role;
  const action = body.action;
  if (!uuid.test(companyId) || !emailPattern.test(email) || email.length > 254 ||
      name.length < 2 || name.length > 120 ||
      (role !== "seller" && role !== "supervisor") ||
      (action !== "preview" && action !== "send")) {
    return respond(origin, 422, { error: "Preencha empresa, nome, e-mail, função e operação válidos." });
  }

  // Primeiro, autorização com o JWT real do usuário no PostgREST, SEM service_role.
  // A RPC gc_admin_event_feed valida Diretoria ativa e exige aal2 quando há fator verificado.
  // Isso ocorre antes de consultar o histórico ou chamar inviteUserByEmail com service_role.
  const actingClient = createClient(projectUrl, publicKey, {
    global: { headers: { Authorization: jwtHeader } },
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { error: accessError } = await actingClient.rpc("gc_admin_event_feed", {
    p_company_id: companyId,
    p_limit: 1,
  });
  if (accessError) {
    return respond(origin, 403, {
      error: "Acesso administrativo não autorizado. Confirme o segundo fator, quando configurado."
    });
  }

  // Autorização feita diretamente no banco, por sessão atual. Não usa claims de papel no JWT.
  const { data: manager, error: membershipError } = await admin.from("gc_memberships")
    .select("company_id")
    .eq("company_id", companyId).eq("user_id", actorId)
    .eq("role", "manager").eq("active", true).maybeSingle();
  if (membershipError) return respond(origin, 503, { error: "Não foi possível validar a autorização." });
  if (!manager) return respond(origin, 403, { error: "Somente a Diretoria ativa desta empresa pode convidar." });

  const enabled = sendingEnabled();
  const { data: previous, error: duplicateError } = await admin.from("gc_invite_history")
    .select("id,status").eq("company_id", companyId).eq("target_email", email)
    .in("status", ["processing", "sent", "link_pending"]).limit(1);
  if (duplicateError) return respond(origin, 503, { error: "Não foi possível consultar convites anteriores." });
  const duplicate = (previous || []).length > 0;

  if (action === "preview") {
    return respond(origin, 200, {
      valid: true, sending_enabled: enabled, already_invited: duplicate,
      email, display_name: name, role,
      message: enabled
        ? "Dados conferidos. O envio exige uma confirmação explícita."
        : "Convites por e-mail desativados neste piloto. Nenhuma mensagem foi enviada."
    });
  }
  if (!enabled) return respond(origin, 409, { error: "Envio bloqueado: SMTP, URL e ativação controlada ainda não foram homologados." });
  if (duplicate) return respond(origin, 409, { error: "Existe um convite ativo para este e-mail nesta empresa." });

  // Limites de uso no servidor e em banco. Uma tentativa concorrente para o mesmo e-mail
  // é bloqueada pelo índice UNIQUE parcial.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: rateError } = await admin.from("gc_invite_history")
    .select("id", { count: "exact", head: true })
    .eq("actor_user_id", actorId).gte("created_at", since);
  if (rateError) return respond(origin, 503, { error: "Controle de limites indisponível." });
  if ((recentCount || 0) >= maxPerManager24h) {
    return respond(origin, 429, { error: "Limite diário de convites atingido." });
  }
  const { data: reserved, error: reservationError } = await admin.from("gc_invite_history")
    .insert({
      company_id: companyId, actor_user_id: actorId, target_email: email,
      target_name: name, target_role: role, status: "processing"
    }).select("id,status").single<InvitationRecord>();
  if (reservationError || !reserved) return respond(origin, 409, {
    error: "Convite já em andamento ou não foi possível reservar a operação."
  });

  const mark = async (status: "failed" | "link_pending" | "sent", userId?: string): Promise<void> => {
    const { error } = await admin.from("gc_invite_history")
      .update({
        status, error_code: status === "failed" ? "invite_delivery_failed" :
          status === "link_pending" ? "membership_link_failed" : null,
        linked_user_id: userId || null, updated_at: new Date().toISOString()
      }).eq("id",reserved.id);
    if (error) console.error("Invite audit update failure",reserved.id);
  };
  try {
    // A URL de retorno é fixa no servidor; não aceitamos redirect fornecido pelo navegador.
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: Deno.env.get("GC_INVITE_REDIRECT_URL")!,
    });
    if (inviteError || !invited.user?.id) {
      await mark("failed");
      return respond(origin, 502, { error: "O provedor de e-mail não concluiu o convite. Verifique SMTP e tente novamente." });
    }

    // Vínculo realizado com as credenciais da própria Diretoria, passando pela mesma
    // regra de autorização RPC da v0.13. Um erro nunca concede acesso por padrão.
    const { error: linkError } = await actingClient.rpc("gc_admin_save_member", {
      p_company_id: companyId,
      p_user_id: invited.user.id,
      p_display_name: name,
      p_role: role,
      p_active: true
    });
    if (linkError) {
      await mark("link_pending", invited.user.id);
      return respond(origin, 409, { error: "Convite criado, mas o vínculo não foi concluído. Não reenvie; solicite revisão administrativa." });
    }
    await mark("sent", invited.user.id);
    return respond(origin, 200, { sent: true, message: "Convite enviado e vínculo criado com sucesso." });
  } catch (err) {
    console.error("Unexpected invite failure",err instanceof Error ? err.name : "unknown");
    await mark("link_pending");
    return respond(origin, 503, { error: "Operação interrompida. Verifique a auditoria antes de repetir." });
  }
});
