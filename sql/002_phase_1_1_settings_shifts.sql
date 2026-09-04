-- ============================================================
-- GUVEL Operational — Phase 1.1 Settings: Shifts
-- Version: 1.1
-- Migration type: VALIDATION / NON-DESTRUCTIVE
-- ============================================================
-- The shifts table and its company relationship were created in
-- Foundation v1.0. This phase adds no destructive schema changes.
--
-- APPROVED RELATIONSHIP (PRESERVED):
-- shifts.company_id -> companies.id
--
-- Option A business rule:
-- excluded_planned_minutes = total excluded planned time in minutes.
--
-- This file is intentionally safe to run after Foundation v1.0.

create index if not exists idx_shifts_company_code
on shifts(company_id, code);
