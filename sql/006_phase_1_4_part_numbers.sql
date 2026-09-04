-- ============================================================
-- GUVEL OPERATIONAL — PHASE 1.4
-- PART NUMBERS
-- ============================================================
-- SOURCE: Phase 1.3 architecture
-- RULE: Preserve existing IDs and foreign-key relationships.
--
-- Existing relationships reused:
--   part_numbers.company_id  -> companies.id
--   part_numbers.customer_id -> customers.id
--
-- No new customer relationship is created.
-- No existing relationship is renamed or removed.
-- ============================================================

-- Support index for company-scoped part number lookup.
create index if not exists idx_part_numbers_company_number
  on public.part_numbers(company_id, part_number);

-- Support index for customer profile / linked part number lookup.
create index if not exists idx_part_numbers_customer
  on public.part_numbers(customer_id);

-- Verification only:
-- select company_id, customer_id, part_number, description,
--        cost_per_piece, scrap_cost
-- from public.part_numbers
-- order by part_number;

-- ============================================================
-- RELATIONSHIP PRESERVATION
-- ============================================================
-- companies.id
--   -> customers.company_id
--   -> part_numbers.company_id
--
-- customers.id
--   -> part_numbers.customer_id
--
-- Part Numbers will become the parent entity for:
--   operations.part_number_id
--   part_number_machines.part_number_id
--   scrap_catalog.part_number_id
--   future cycle-time configuration
-- ============================================================
