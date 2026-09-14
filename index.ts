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
    const invitation_id = String(body.invitation_id || "").trim();
    const invitation_token = String(body.invitation_token || "").trim();
    if (!invitation_id) return json({ error: "invitation_id is required" }, 400);
    if (!invitation_token) return json({ error: "invitation_token is required" }, 400);

    const { data: invitation, error: invitationError } = await admin.from("company_invitations")
      .select("id,company_id,email,invited_name,role,status,expires_at")
      .eq("id", invitation_id)
      .maybeSingle();
    if (invitationError) return json({ error: `Invitation lookup failed: ${invitationError.message}` }, 500);
    if (!invitation) return json({ error: "Invitation not found" }, 404);
    if (invitation.status !== "pending") return json({ error: "Invitation is not pending" }, 409);
    if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) return json({ error: "Invitation has expired" }, 409);

    const { data: company, error: companyError } = await admin.from("companies")
      .select("name,subdomain").eq("id", invitation.company_id).maybeSingle();
    if (companyError || !company) return json({ error: "Company could not be loaded" }, 500);

    const appOrigin = `https://${company.subdomain}.guvelsystems.com`;
    const inviteUrl = `${appOrigin}/?invite=${encodeURIComponent(invitation_token)}`;
    const name = invitation.invited_name || "GUVEL user";
    const email = invitation.email;
    const role = invitation.role;
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
