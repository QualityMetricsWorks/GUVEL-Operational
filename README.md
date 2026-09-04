# GUVEL Operational — Foundation v1.0

## Stack for this phase
- GitHub repository
- GitHub Pages
- Supabase
- Vanilla HTML / CSS / JavaScript
- No Node.js, npm, Vite or local compilation required

## Upload order
1. Create a new GitHub repository named `guvel-operational`.
2. Upload the contents of this folder to the repository root.
3. In Supabase, create a new project for GUVEL Operational.
4. Open SQL Editor and run `sql/001_guvel_operational_foundation.sql` once in a clean project.
5. Copy the project URL and anon key into `js/config.js`.
6. In GitHub: Settings > Pages > Deploy from branch > main > /(root).
7. Open the Pages URL.

## Important architecture rules
- `company_id` is the tenant boundary from day one.
- Customers, part numbers, machines, shifts and catalogs are master data.
- A production capture is the transactional source of truth.
- One capture can have multiple scrap events and multiple downtime events.
- Registers are views of transactional data, not duplicated tables.
- Planned and unplanned downtime are stored explicitly.
- Authentication and RLS are deferred, but the schema is prepared for future company isolation.

## Current Foundation scope
The interface is a structural foundation. The database schema is the governing data model for the next development stages. CRUD logic and live dashboard calculations should be added only against this schema.

## Do not use
Never place the Supabase `service_role` key in `config.js` or GitHub.

## Phase 1.1 — Settings: Shifts
This release adds functional CRUD for production shifts using the existing Foundation v1.0 schema. Run `sql/002_phase_1_1_settings_shifts.sql` in Supabase after Foundation v1.0. No existing foreign-key relationship is changed.

Mandatory architecture reference: `RELATIONSHIP_MAP_v1.1.txt`.
