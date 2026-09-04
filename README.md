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


# Phase 1.3 — Customers

This release adds functional Customers CRUD on top of Phase 1.2.

Run the SQL migrations in this order if not already completed:

1. `001_guvel_operational_foundation.sql`
2. `002_phase_1_1_settings_shifts.sql`
3. `003_phase_1_2_auth_company_foundation.sql`
4. `005_phase_1_3_customers.sql`

`004_adopt_existing_demo_company_TEMPLATE.sql` remains a historical/template helper for adopting a pre-existing company.

## Important correction

Phase 1.3 contains a UUID-scoped migration that corrects the previously inverted `name` and `code` values for the already-existing GUVEL Demo Company. It does not change `companies.id`, so existing `company_id` relationships remain valid.


# Phase 1.4 — Part Numbers

Run `sql/006_phase_1_4_part_numbers.sql` after all previous migrations.

This phase reuses the existing data model:
- `part_numbers.company_id -> companies.id`
- `part_numbers.customer_id -> customers.id`

It intentionally adds no new relationship between Company, Customer and Part Number.

The included `js/config.js` contains the current project URL and publishable key for this development project.


## Formal Closure — v1.4.2

This package formally closes v1.4.2 as an accepted baseline.

Architecture Lock v2 includes:
- DATABASE_SCHEMA_MAP
- RELATIONSHIP_MAP
- SECURITY_MAP
- VERSION_HISTORY
- SYSTEM_CONTRACT
- LESSONS_LEARNED

Do not begin the next phase without reviewing these documents.


## Phase 1.5 — Machines

This phase reuses the existing `machines` and `part_number_machines`
tables from the Foundation. It does not create duplicate schema.

Run:
`sql/009_phase_1_5_machines.sql`

Then deploy the frontend files.

Before testing, make sure at least one Part Number exists.

Phase 1.5 remains open until `USER_ACCEPTANCE_TEST_v1.5.txt` passes.


## v1.6.2 Hotfix 4 — Machines UI Refinement

No SQL execution is required for this version.

Changes are frontend-only:
- compact searchable Part Number dropdown;
- highlighted Machine Code profile action;
- close X for Machine Profile.


## Formal Closure — v1.6.2 Hotfix 4

Status: **CLOSED / ACCEPTED**

This ZIP is the formal Architecture Lock baseline after successful
user acceptance of the Machines module and its UI refinement.

Next development must start from this baseline.
