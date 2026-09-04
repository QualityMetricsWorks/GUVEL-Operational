-- ============================================================
-- GUVEL OPERATIONAL — PHASE 1.5 MACHINES
-- ============================================================
-- Architecture Lock v2 reviewed before development.
--
-- EXISTING TABLES REUSED:
-- public.machines
-- public.part_number_machines
--
-- NO NEW DUPLICATE MACHINE TABLE.
-- NO CHANGE TO part_numbers.
-- NO CHANGE TO company_id relationships.
-- NO RLS POLICY CHANGE.
--
-- Existing relationships:
-- machines.company_id -> companies.id
-- part_number_machines.machine_id -> machines.id
-- part_number_machines.part_number_id -> part_numbers.id
--
-- This phase activates the existing architecture in the frontend.
-- ============================================================

create index if not exists idx_machines_company_code
  on public.machines(company_id, code);

create index if not exists idx_part_number_machines_machine
  on public.part_number_machines(machine_id);

create index if not exists idx_part_number_machines_part_number
  on public.part_number_machines(part_number_id);

-- Verification queries:
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema='public' and table_name='machines'
-- order by ordinal_position;
--
-- select policyname, cmd
-- from pg_policies
-- where schemaname='public'
-- and tablename in ('machines','part_number_machines')
-- order by tablename, policyname;
