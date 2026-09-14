-- ============================================================
-- GUVEL OPERATIONAL — v1.4.2
-- FRONTEND ROUTING FIX
-- ============================================================
-- No database migration is required for this patch.
-- No columns, IDs, foreign keys or RLS policies are changed.
--
-- This file exists only to document that the database schema remains
-- unchanged and the defect was in the frontend page routing:
--
-- OLD:
-- Part Numbers -> static Foundation table
--
-- NEW:
-- Part Numbers -> partNumbersPage() CRUD module
-- ============================================================

select 'No database changes required for GUVEL Operational v1.4.2' as result;
