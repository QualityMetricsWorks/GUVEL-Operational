-- GUVEL OPERATIONAL — PHASE 1.6.1
-- PART NUMBER OPERATIONAL PROFILE
-- Architecture baseline: v1.5.1-R / Phase 1.6 Catalog Corrected
-- New relationship source of truth for cycle time:
-- company + part number + operation + machine

begin;

create table if not exists public.operation_machine_cycle_times (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  part_number_id uuid not null references public.part_numbers(id) on delete cascade,
  operation_id uuid not null references public.operations(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  cycle_time_seconds numeric not null check (cycle_time_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_id, machine_id)
);

alter table public.operation_machine_cycle_times enable row level security;

drop policy if exists operation_machine_cycle_times_company_select on public.operation_machine_cycle_times;
drop policy if exists operation_machine_cycle_times_company_insert on public.operation_machine_cycle_times;
drop policy if exists operation_machine_cycle_times_company_update on public.operation_machine_cycle_times;
drop policy if exists operation_machine_cycle_times_company_delete on public.operation_machine_cycle_times;

create policy operation_machine_cycle_times_company_select
on public.operation_machine_cycle_times for select to authenticated
using (is_company_member(company_id));

create policy operation_machine_cycle_times_company_insert
on public.operation_machine_cycle_times for insert to authenticated
with check (is_company_member(company_id));

create policy operation_machine_cycle_times_company_update
on public.operation_machine_cycle_times for update to authenticated
using (is_company_member(company_id))
with check (is_company_member(company_id));

create policy operation_machine_cycle_times_company_delete
on public.operation_machine_cycle_times for delete to authenticated
using (is_company_member(company_id));

commit;
