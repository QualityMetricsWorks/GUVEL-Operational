# GUVEL Operational — Phase 2.3H

## Included corrections
- Preserves the invitation token and the original portal origin in localStorage.
- Uses the original invitation portal for Supabase Confirm Email redirects.
- Attempts invitation acceptance whenever an authenticated session exists and a pending token is available.
- Sends the real invitation token to the Edge Function so the email link is usable.
- Edge Function reads `invited_name`, not `full_name`.
- Edge Function supports `SUPABASE_SECRET_KEY` with fallback to the deprecated service-role key.
- Frontend keeps `SUPABASE_ANON_KEY` compatibility.

## Required deployment
1. Replace the frontend files in GitHub.
2. Deploy the Edge Function:
   `supabase functions deploy send-company-invitation`
3. Confirm Edge Function secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` (recommended)
   - `RESEND_API_KEY`
   - `RESEND_FROM`
4. Create a NEW test invitation after deployment. Do not reuse an old confirmation email.
5. Open the invitation from the company subdomain, register, confirm email, and verify that the invitation becomes `accepted`.

## Important
The Supabase Auth confirmation email will still be sent by Supabase unless custom SMTP is configured in Supabase Auth using Resend. This package fixes the redirect and invitation acceptance flow; SMTP branding is a separate Supabase Auth configuration.
