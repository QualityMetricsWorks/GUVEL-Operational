# GUVEL Operational — Phase 2.3.C Security Fix

## Objective

Restrict company creation to the GUVEL Platform Super Admin only.

Configured platform creator:

`c70724a7-4e3d-4f77-ac79-b7bdeb8de161`

## SQL migration

Run this file in Supabase SQL Editor:

`sql/021_phase_2_3C_platform_super_admin_security.sql`

Do not rerun the older company-provisioning migrations.

## Expected behavior

- Platform Super Admin: can create companies.
- Owner/Admin/Manager/Supervisor/Viewer: cannot create companies.
- Users without a company: cannot create companies and do not see Company Setup.
- Direct inserts into `companies` are blocked unless performed by the Platform Super Admin.
- Existing companies and memberships are preserved.

## Frontend

The frontend now sends users without an active membership to an Access Pending screen instead of Company Setup. Company Setup remains reserved for the platform-level creator.

## Important

This phase is the security correction. The invitation onboarding flow remains the next block and must be tested separately after this migration is applied.
