# GUVEL Operational — Phase 2.3.C
## Secure Invitation Onboarding

### Important
This phase changes the invitation UI and database contract. The email must be sent by the secure Hostinger endpoint; the browser must never contain a Resend API key or service-role key.

### SQL
Run:

`sql/019_phase_2_3C_secure_invitation_onboarding.sql`

### GitHub
Replace/add:

- `js/app.js`
- `sql/019_phase_2_3C_secure_invitation_onboarding.sql`
- `PHASE_2_3C_README.md`
- `VERSION_PHASE_2_3C.txt`

### Expected owner flow
Invite User → Name + Email + Role → Send Invitation → email is delivered automatically.

The copy-token and copy-link controls are removed from the UI.

### Expected invitee flow
Open email → create own password → confirm email → enter assigned company.

Company Setup must only be shown to users without a valid invitation and without company membership.

### Mail endpoint configuration
Configure the existing Hostinger endpoint with server-side variables:

- `RESEND_API_KEY`
- `RESEND_FROM`
- `GUVEL_DELIVERY_SECRET`

Do not put these values in `js/config.js` or `js/app.js`.

### Critical schema check
Before running the SQL, verify that `company_invitations` uses the column `token`. If the existing token column has a different name, adjust the insert statement accordingly.
