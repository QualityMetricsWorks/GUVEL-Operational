GUVEL Operational — Phase 2.2 HOTFIX 2

Purpose:
Fix Owner-only Create New Company visibility when Settings rendered before the membership role was available.

Frontend fix:
- Settings Company Identity now calls ensureAdditionalCompanyButton().
- If current role is owner and the button is absent, the button is injected into the existing actions area.
- Button remains hidden for non-owner roles.
- No new database migration is required.
- Cache-busting token updated to GUVEL-2-2-HF2-1.

Validation:
- app.js passed node --check.
- ZIP integrity verified.
