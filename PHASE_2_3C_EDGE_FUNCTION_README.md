# GUVEL Phase 2.3.C — Secure Invitation Onboarding

This version uses GitHub Pages + Supabase + Supabase Edge Functions + Resend + Cloudflare. Hostinger is not used as PHP hosting.

## Install
1. Execute `sql/020_phase_2_3C_secure_invitation_delivery.sql` only if the previous 019 migration has not already been applied.
2. Deploy `supabase/functions/send-company-invitation/index.ts` as the function `send-company-invitation`.
3. Configure Supabase secrets: `RESEND_API_KEY`, `RESEND_FROM`, and ensure `SUPABASE_SERVICE_ROLE_KEY` is available to Edge Functions.
4. Deploy the updated `js/app.js` to GitHub Pages.

## Expected flow
Owner/Admin enters Name, Email and Role → function creates token → Resend sends branded GUVEL email → invitee opens link → creates password → confirms email → joins the invited company.

Do not put Resend or service-role secrets in GitHub or frontend code.


## Phase 2.3G correction
The frontend calls `create_company_invitation_with_token_as_platform_admin` and sends the returned raw token to the authenticated Edge Function. The Edge Function reads `invited_name` and builds the invite URL with the raw token, never with the invitation UUID.
