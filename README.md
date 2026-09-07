# GUVEL Operational — Phase 1.9.C — Production Dashboard

**Status: READY FOR USER ACCEPTANCE**

This release is built from the accepted Phase 1.9.B Hotfix 6 baseline.

## Current scope

The Dashboard now includes a functional **Production** tab for detailed OEE and production analysis. The accepted General Dashboard remains the executive overview and is not redesigned by this phase.

### Production KPIs
- OEE
- Availability
- Performance
- Quality
- Production
- Good Pieces

### Production charts
- OEE Trend
- Production vs Good vs Scrap
- OEE Components
- Production by Machine
- Production by Shift
- Ideal vs Actual Cycle Time
- Downtime by Machine

### Configuration
Production KPI and chart configuration reuse the validated Phase 1.9.B mechanism, including Save, Cancel, X, Reset, thresholds, colors, Min, Max and Objective.

## Database
No new SQL, tables, columns, relationships or RLS policies are required.

## Acceptance
Phase 1.9.C remains open until user validation is completed.

## Phase 1.9.C Hotfix 1

Corrected Production Dashboard OEE/Availability aggregation. Planned shift time is counted once per Date + Shift + Machine group; capture-level production and ideal-cycle contributions are aggregated; unplanned downtime is summed before Operating Time is calculated. Availability, Performance and OEE are bounded to 100% for dashboard presentation. General and Production now share the same OEE aggregation contract. Removed OEE Components and Downtime by Machine from the Production Dashboard. No database, SQL, relationship, or RLS changes.


EXPERIENCE UPGRADE v9
- Authentication screen now uses the GUVEL red laser cursor.
- Existing application/fullscreen cursor behavior remains unchanged.
- Cache version: GUVEL-UI9.
