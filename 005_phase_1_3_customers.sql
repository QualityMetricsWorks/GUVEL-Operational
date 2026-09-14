-- ============================================================
-- GUVEL OPERATIONAL — PHASE 1.3
-- CUSTOMERS + EXISTING COMPANY DATA CORRECTION
-- Non-destructive / Relationship-preserving migration
-- ============================================================

-- PURPOSE
-- 1) Customers table already exists from Foundation v1.0.
-- 2) No relationship is renamed or removed.
-- 3) Ensure company-scoped customer performance indexes.
-- 4) Correct the previously inverted NAME/CODE values for the
--    known existing demo company by UUID.
--
-- IMPORTANT:
-- The correction below does NOT change companies.id.
-- Therefore all existing company_id relationships remain intact.

-- ============================================================
-- A. CUSTOMER SUPPORT INDEX
-- ============================================================
create index if not exists idx_customers_company_code
  on public.customers(company_id, code);

-- ============================================================
-- B. CORRECT KNOWN EXISTING DEMO COMPANY DISPLAY DATA
-- ============================================================
-- Existing company UUID confirmed during Phase 1.2:
-- 3f883761-f91a-467f-a6d2-af60896e0136
--
-- Previous stored values were:
--   name = 'GUVEL-DEMO'
--   code = 'GUVEL Demo Company'
--
-- Correct intended values:
--   name = 'GUVEL Demo Company'
--   code = 'GUVEL-DEMO'
--
-- This UPDATE is intentionally scoped to ONE UUID and therefore
-- does not alter any other company or any foreign-key relationship.

update public.companies
set
  name = 'GUVEL Demo Company',
  code = 'GUVEL-DEMO',
  updated_at = now()
where id = '3f883761-f91a-467f-a6d2-af60896e0136'
  and name = 'GUVEL-DEMO'
  and code = 'GUVEL Demo Company';

-- ============================================================
-- C. VERIFICATION QUERY
-- ============================================================
-- Run this after the migration if you want to verify the result:
--
-- select id, name, code
-- from public.companies
-- where id = '3f883761-f91a-467f-a6d2-af60896e0136';
--
-- Expected:
-- name = GUVEL Demo Company
-- code = GUVEL-DEMO
--
-- ============================================================
-- RELATIONSHIPS PRESERVED
-- ============================================================
-- companies.id
--   └── customers.company_id
--   └── part_numbers.company_id
--   └── machines.company_id
--   └── shifts.company_id
--   └── company_members.company_id
--   └── all existing operational company_id relationships
--
-- customers.id
--   └── part_numbers.customer_id
--   └── production_captures.customer_id
--
-- No foreign key was removed, renamed, or redirected.
-- ============================================================
