# GUVEL Operational — Phase 1.8: Registers

## Status
READY FOR USER ACCEPTANCE

## Scope
Phase 1.8 adds the Registers module with three read-only operational views:

- Production
- Scrap
- Downtime

Registers are query surfaces over the existing transactional Capture model. They do not create duplicate register tables.

## Transactional source model

`production_captures` is the parent transaction.

`0..N scrap_events` and `0..N downtime_events` are children linked by `production_capture_id`.

Customer, Part Number, Machine, Operation and Shift context is inherited through the parent Capture rather than duplicated in event tables.

## Register behavior

Each register supports:
- Date From / Date To
- Customer
- Part Number
- Shift
- Free-text search
- Clear Filters
- Refresh

The Scrap register also calculates displayed Scrap Cost as:

`Scrap Quantity × Part Number Scrap Cost`

The Downtime register displays event Type and Minutes.

## Database

No SQL migration is required.
No new table is required.
No new column is required.
No RLS change is required.

## Files

The package preserves the Architecture Lock records from previous phases and adds Phase 1.8 records:

- PREFLIGHT_PHASE_1_8.txt
- GUVEL_Operational_Phase_1.8_DATABASE_SCHEMA_MAP.txt
- GUVEL_Operational_Phase_1.8_DATABASE_RELATIONSHIP_MAP.txt
- GUVEL_Operational_Phase_1.8_SECURITY_MAP.txt
- GUVEL_Operational_Phase_1.8_SYSTEM_CONTRACT.txt
- GUVEL_Operational_Phase_1.8_LESSONS_LEARNED.txt
- GUVEL_Operational_Phase_1.8_VERSION_HISTORY.txt
- RELEASE_VALIDATION_PHASE_1_8.txt
- USER_ACCEPTANCE_TEST_v1.8.txt

Dashboard remains intentionally deferred until the final stage.

## Phase 1.8 Hotfix 1 — Deletion + Filter Correction

Hotfix 1 extends Registers with controlled source deletion and fixes Customer / Part Number filter population.

Deletion behavior:
- Production: Delete Capture removes the complete Capture transaction; existing FK cascades remove linked Scrap and Downtime.
- Scrap: Delete Scrap removes only the selected Scrap event.
- Downtime: Delete Downtime removes only the selected Downtime event.

Filters:
- Customer options load after master data is available.
- Part Number options load after master data is available.
- Selecting Customer narrows Part Number choices.

No SQL migration, schema change, or RLS change is required.

Status: READY FOR USER ACCEPTANCE


## Phase 1.8 Hotfix 2 — Register Deletion Stability
- Stabilized consecutive Register deletions with persistent event delegation.
- DELETE is verified by returned row id.
- Local Register state updates immediately after confirmed deletion.
- No database schema or RLS changes.
- Release pending user acceptance.

## Phase 1.9.B — General Dashboard

Phase 1.9.B implements the General Dashboard analytical surface using the approved Phase 1.9.A KPI contract.

Implemented:
- Global filters: Date From, Date To, Customer, Part Number, Shift, Machine.
- OEE, Production, Scrap, PPMs, Yield and Direct Scrap Cost / COPQ Proxy.
- Supporting Availability, Performance and Downtime indicators.
- Production/Scrap trend.
- Data-quality handling for OEE prerequisites.

No SQL/schema/RLS change is required.
Production, Quality and Performance detailed dashboard views remain deferred to later Phase 1.9 subphases.

Status: READY FOR USER ACCEPTANCE


## Phase 1.9.B Hotfix 2
KPI comparison display corrected to percent difference for OEE/Scrap/Yield/COPQ. Added KPI gear threshold/color configuration and per-chart Min/Max/Objective reference-line configuration. Frontend/local preferences only; no SQL/schema/RLS changes.


## Phase 1.9.B Hotfix 2
Corrected KPI comparison display and added configurable KPI threshold colors plus chart Min/Max/Objective reference lines. Frontend/local preferences only; no SQL/schema/RLS changes.


## Phase 1.9.B Hotfix 3
Fixed Dashboard KPI and chart configuration modal controls. The configuration overlay is now always initialized before event binding, so Save, Cancel, X, and Reset work reliably for both KPI and chart settings. No SQL/schema/RLS changes.
