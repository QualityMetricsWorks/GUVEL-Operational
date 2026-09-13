# GUVEL Operational — Phase 2.3.G

## Fix included

The invitation flow now follows this order:

1. Create the invitation with `create_company_invitation_as_platform_admin`.
2. Receive the created invitation ID.
3. Call `send-company-invitation` with `invitation_id`.
4. The Edge Function loads the existing invitation and sends the GUVEL email through Resend.

This prevents the Edge Function from trying to create the invitation itself before the invitation record exists.

## Deploy

- Replace the frontend files in GitHub Pages.
- Deploy the updated `supabase/functions/send-company-invitation/index.ts`.
- No new SQL migration is required if `022_phase_2_3E_invitation_admin_rpc.sql` was already executed.
