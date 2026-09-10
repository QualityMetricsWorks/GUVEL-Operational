GUVEL Operational — Phase 2.0.5 HOTFIX 1

Purpose
-------
Fix the Users > Invitations creation UX after the invitation was successfully created in Supabase but the frontend did not reliably show the success state.

Root cause addressed
--------------------
The frontend treated token/link presentation and invitation-table refresh as part of the same success path. HOTFIX 1 makes the successful RPC response the explicit transaction boundary:
1. create_company_invitation succeeds
2. token is normalized and validated
3. Success is rendered immediately
4. invitation link/token copy controls are bound
5. invitation table refresh runs independently and cannot hide the success state

Changes
-------
- No Supabase SQL changes.
- No database schema changes.
- No changes to invitation RPCs.
- Explicit "Invitation created successfully." state.
- Robust extraction of invitation_token from the RETURNS TABLE RPC response.
- Invitation URL built without changing current page state.
- Copy Invitation Link and Copy Token controls.
- Manual-select fallback if clipboard access is unavailable.
- Invitation list refresh is isolated from the success UI.
- Cache version updated to GUVEL-2-0-5-HF1.

Hostinger + Resend
------------------
The personalized email delivery layer remains server-side only. RESEND_API_KEY must never be placed in GitHub Pages JavaScript. The Hostinger PHP template remains separate from this frontend hotfix.

Deployment
----------
Replace the web files in GitHub Pages with the contents of this package and force refresh with Ctrl+F5.
Do NOT execute SQL for this hotfix.
