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
