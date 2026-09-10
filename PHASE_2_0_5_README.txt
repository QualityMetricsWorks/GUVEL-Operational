GUVEL Operational — Phase 2.0.5
Invitation Acceptance & Account Onboarding
Status: READY FOR DEPLOYMENT / VALIDATION

BASELINE
- Built from GUVEL Operational Phase 2.0.4 Hotfix 3.
- Phase 2.0.3 invitation backend remains the source of truth.
- No Phase 2.0.3 or 2.0.4 SQL needs to be rerun.
- No operational/demo data migration is included.

SCOPE
1. Invitation links are generated from the real one-time invitation token.
2. Users can receive a GUVEL invitation URL instead of manually handling the token.
3. Invitation URL opens a dedicated onboarding experience.
4. New invited users can create an account from the invitation flow.
5. Existing authenticated users can accept the invitation.
6. The existing accept_company_invitation(text) SECURITY DEFINER RPC remains the only supported path into company_members.
7. The invitation token is persisted locally only while onboarding is incomplete, then removed after acceptance.
8. The URL is cleaned after successful acceptance.
9. Wrong-email, expired, revoked, invalid and already-member conditions are surfaced from the backend RPC.
10. Users and Personnel remain completely separate concepts.

PERSONALIZED EMAIL ARCHITECTURE
- GUVEL invitation email delivery is intentionally designed for Hostinger + Resend.
- The GitHub Pages frontend must NEVER contain the Resend API key.
- A Hostinger server-side endpoint template is included under server/hostinger/send-invitation.php.
- The template is NOT automatically wired to the browser in this phase because a public browser endpoint cannot safely hold a delivery secret.
- Production wiring should be server-to-server and authenticated.
- The invitation URL, company name and assigned role are the inputs for the personalized email.

DEPLOYMENT
1. Replace the web application with this package.
2. Preserve the folder structure.
3. Wait for GitHub Pages deployment.
4. Hard refresh with Ctrl+F5.
5. Create a test invitation from Users > Invitations.
6. Copy the Invitation Link (not the technical token).
7. Open the link in a private/incognito window.
8. Create a test account using the exact invited email.
9. Confirm the invitation is accepted and the user is redirected into the company.
10. Verify Users shows the new membership with the invited role.

SUPABASE
- No SQL execution is required for this phase if Phase 2.0.3 was successfully validated.
- The existing accept_company_invitation(text) RPC is reused unchanged.

ROLLBACK
- Revert the frontend files to Phase 2.0.4 Hotfix 3.
- No database rollback is required because this phase is frontend/onboarding plus an email-delivery template only.
