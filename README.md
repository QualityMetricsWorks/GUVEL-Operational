# GUVEL Operational — Phase 1.2: Authentication & Company Foundation

This release is built directly on Phase 1.1.

## Important migration order
1. Keep the existing Foundation and Phase 1.1 files in GitHub.
2. Run `sql/003_phase_1_2_auth_company_foundation.sql` in Supabase.
3. Replace/update the frontend files from this ZIP in GitHub.
4. Create your login account in the published portal.
5. Because `GUVEL Demo Company` already existed before authentication, run `sql/004_adopt_existing_demo_company_TEMPLATE.sql` after replacing `YOUR_LOGIN_EMAIL` with your exact login email.
6. Sign in again. The existing company should load through `company_members`.

## Important Supabase setting
For initial testing, you may need to review Supabase Auth email confirmation settings. If email confirmation is enabled, confirm the account before signing in.

## What changed
- `ACTIVE_COMPANY_ID` is no longer used.
- The active company comes from authenticated membership.
- Existing `company_id` links remain unchanged.
- Temporary anonymous Shift policies are removed by migration 003.

## Architecture records
- `RELATIONSHIP_MAP_v1.2.txt`
- `SECURITY_MAP_v1.2.txt`
- `VERSION_HISTORY.txt`

These files must remain in future releases and be updated before any relationship or security change is introduced.
