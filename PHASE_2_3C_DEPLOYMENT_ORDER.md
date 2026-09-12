# GUVEL Operational — Phase 2.3.C
## Deployment order — GitHub + Supabase + Hostinger + Resend + Cloudflare

## Important architecture
- GitHub Pages: frontend.
- Supabase: authentication, companies, invitations, roles and membership.
- Hostinger: secure PHP mail endpoint.
- Resend: personalized GUVEL email delivery.
- Cloudflare: DNS, SSL and subdomain routing.

## Do not remove Hostinger or Resend
Cloudflare only manages DNS/proxy/SSL. It does not replace the Hostinger mail endpoint or Resend.

## Installation order
1. Run `sql/019_phase_2_3C_secure_invitation_onboarding.sql` in Supabase.
2. Publish `js/app.js` and the documentation to GitHub Pages.
3. Upload `server/hostinger/send-invitation.php` to the existing Hostinger endpoint.
4. Configure the server-side values on Hostinger only:
   - `RESEND_API_KEY`
   - `RESEND_FROM`
   - `GUVEL_DELIVERY_SECRET`
5. Do not place those values in GitHub or JavaScript.
6. Confirm the Resend sending domain is verified for `guvelsystems.com`.
7. Test with a new email address.

## Expected flow
Owner/Admin: Name + Email + Role → Send Invitation → automatic GUVEL email.
Invitee: open email → create own password → confirm email → assigned company.

`Company Setup` must not appear for a valid invitation.
