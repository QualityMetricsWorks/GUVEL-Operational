import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;",
  }[char] || char));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await request.json();
    const company_id = String(body.company_id || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "viewer").trim().toLowerCase();
    if (!company_id || !name || !email) return json({ error: "Company, name and email are required" }, 400);
    if (!["owner", "admin", "manager", "supervisor", "viewer"].includes(role)) return json({ error: "Invalid role" }, 400);

    const { data: membership } = await admin.from("company_members")
      .select("role,is_active").eq("company_id", company_id).eq("user_id", user.id).maybeSingle();
    if (!membership?.is_active || !["owner", "admin"].includes(membership.role))
      return json({ error: "Only Owner or Admin can invite users" }, 403);

    const { data: invitation, error: invitationError } = await supabase.rpc("create_company_invitation", {
      target_company_id: company_id, target_name: name, target_email: email, target_role: role,
    });
    if (invitationError) return json({ error: invitationError.message }, 400);
    const row = Array.isArray(invitation) ? invitation[0] : invitation;
    const token = row?.invitation_token;
    if (!token) return json({ error: "Invitation token was not generated" }, 500);

    const { data: company, error: companyError } = await admin.from("companies")
      .select("name,subdomain").eq("id", company_id).maybeSingle();
    if (companyError || !company) return json({ error: "Company could not be loaded" }, 500);

    const appOrigin = `https://${company.subdomain}.guvelsystems.com`;
    const inviteUrl = `${appOrigin}/?invite=${encodeURIComponent(token)}`;
    const from = Deno.env.get("RESEND_FROM") || "GUVEL <noreply@guvelsystems.com>";
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY is not configured" }, 500);

    const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#143980"><div style="max-width:620px;margin:30px auto;background:#fff;border:1px solid #e5e7eb"><div style="padding:28px;background:#143980;text-align:center"><img src="https://guvelsystems.com/assets/guvel-logo.png" alt="GUVEL" style="max-width:220px;height:auto"></div><div style="padding:32px"><h1 style="color:#143980">You have been invited to GUVEL</h1><p>Hello ${escapeHtml(name)},</p><p>You have been invited to join <strong>${escapeHtml(company.name)}</strong> as <strong>${escapeHtml(role)}</strong>.</p><p>Accept the invitation and create your own password to access your company workspace.</p><p style="text-align:center;margin:32px 0"><a href="${inviteUrl}" style="background:#ec6b1e;color:#fff;text-decoration:none;padding:14px 24px;font-weight:bold;display:inline-block">Accept GUVEL Invitation</a></p><p style="font-size:13px;color:#667085">This invitation expires in 7 days.</p></div><div style="padding:20px;text-align:center;background:#f8fafc;font-size:12px;color:#667085">GUVEL Smarter Industrial Systems</div></div></body></html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject: `Invitation to ${company.name} — GUVEL`, html }),
    });
    if (!response.ok) {
      const detail = await response.text();
      return json({ error: `Resend delivery failed: ${detail}` }, 502);
    }
    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
