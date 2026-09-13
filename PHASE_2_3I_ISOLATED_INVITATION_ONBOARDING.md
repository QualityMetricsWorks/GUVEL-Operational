# GUVEL Operational — Phase 2.3I

## Objective
Isolate invitation onboarding from the normal authentication/session flow.

## Included
- Keeps the previous 2.3G secure-token/Resend base.
- Removes the global `onAuthStateChange` invitation handler.
- Normal Super Admin login and existing company access remain unchanged.
- Invitation processing occurs only when `?invite=TOKEN` is present or when the invitation flow explicitly resumes.
- No database migration is included in this package.

## Deployment
1. Upload the contents to the existing GitHub Pages repository.
2. Do not execute SQL for this package.
3. Test normal Super Admin login first in an incognito window.
4. Then test an invitation link separately.

## Important
This package does not change Supabase Auth confirmation-email delivery. Resend is used by the invitation Edge Function; Supabase Auth confirmation emails remain controlled by Supabase until custom SMTP is configured.
