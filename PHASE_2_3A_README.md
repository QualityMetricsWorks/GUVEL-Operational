# GUVEL Operational — Phase 2.3.A — Company Members List

## Objective
Add a company-scoped Users section that lists members of the active company.

## Included
- Users navigation entry.
- Company Members table.
- Full name, email, role, status and joined date.
- Data scoped to the active company.
- Owner/Admin role protection in the UI.
- Supabase RPC: `public.get_company_users(uuid)`.

## Installation
1. Keep the current Phase 2.2 files in GitHub.
2. Run `sql/017_phase_2_3A_company_members.sql` in Supabase.
3. Upload the complete contents of this ZIP to the deployment branch.
4. Wait for deployment.
5. Force refresh the browser.

## Acceptance test
- Open Metrics Works Saltillo.
- Navigate to Users.
- Confirm the current user appears as Owner and Active.
- Open GUVEL Demo.
- Confirm Demo members are shown, without Metrics Works members.
- Confirm a non-member cannot retrieve another company's members.

## Scope boundary
This phase is read-only for membership administration. Role changes, invitations, activation/deactivation and removal are planned for later Phase 2.3 blocks.
