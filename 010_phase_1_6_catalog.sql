-- ============================================================
-- GUVEL OPERATIONAL — PHASE 1.6 CATALOG
-- Architecture Lock v2.1
-- ============================================================
-- Additive migration.
-- Existing tenant boundary remains company_id.
-- Scrap hierarchy:
-- company -> part_numbers -> operations -> defects
-- Downtime catalog:
-- company -> downtime_catalog
-- ============================================================

create table if not exists public.operations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  part_number_id uuid not null references public.part_numbers(id) on delete cascade,
  operation_number text not null,
  name text,
  created_at timestamptz not null default now(),
  unique(part_number_id, operation_number)
);

create table if not exists public.defects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  operation_id uuid not null references public.operations(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null check (category in ('Dimensional','Visual','Material','Process')),
  created_at timestamptz not null default now(),
  unique(company_id, code)
);

create table if not exists public.downtime_catalog (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null check (category in ('Machine','Tooling','Quality','Setup','Personnel','Logistics','Material')),
  created_at timestamptz not null default now(),
  unique(company_id, code)
);

create index if not exists idx_operations_company_part on public.operations(company_id, part_number_id);
create index if not exists idx_defects_company_operation on public.defects(company_id, operation_id);
create index if not exists idx_downtime_catalog_company on public.downtime_catalog(company_id);

alter table public.operations enable row level security;
alter table public.defects enable row level security;
alter table public.downtime_catalog enable row level security;

-- Security contract: authenticated users can access rows belonging to
-- companies in their company_memberships.
-- This migration supports both common naming variants only if the
-- canonical table already exists.
do $$
begin
  if to_regclass('public.company_memberships') is not null then
    execute 'create policy operations_company_select on public.operations for select using (exists (select 1 from public.company_memberships cm where cm.company_id=operations.company_id and cm.user_id=auth.uid()))';
    execute 'create policy operations_company_insert on public.operations for insert with check (exists (select 1 from public.company_memberships cm where cm.company_id=operations.company_id and cm.user_id=auth.uid()))';
    execute 'create policy operations_company_update on public.operations for update using (exists (select 1 from public.company_memberships cm where cm.company_id=operations.company_id and cm.user_id=auth.uid())) with check (exists (select 1 from public.company_memberships cm where cm.company_id=operations.company_id and cm.user_id=auth.uid()))';
    execute 'create policy operations_company_delete on public.operations for delete using (exists (select 1 from public.company_memberships cm where cm.company_id=operations.company_id and cm.user_id=auth.uid()))';

    execute 'create policy defects_company_select on public.defects for select using (exists (select 1 from public.company_memberships cm where cm.company_id=defects.company_id and cm.user_id=auth.uid()))';
    execute 'create policy defects_company_insert on public.defects for insert with check (exists (select 1 from public.company_memberships cm where cm.company_id=defects.company_id and cm.user_id=auth.uid()))';
    execute 'create policy defects_company_update on public.defects for update using (exists (select 1 from public.company_memberships cm where cm.company_id=defects.company_id and cm.user_id=auth.uid())) with check (exists (select 1 from public.company_memberships cm where cm.company_id=defects.company_id and cm.user_id=auth.uid()))';
    execute 'create policy defects_company_delete on public.defects for delete using (exists (select 1 from public.company_memberships cm where cm.company_id=defects.company_id and cm.user_id=auth.uid()))';

    execute 'create policy downtime_catalog_company_select on public.downtime_catalog for select using (exists (select 1 from public.company_memberships cm where cm.company_id=downtime_catalog.company_id and cm.user_id=auth.uid()))';
    execute 'create policy downtime_catalog_company_insert on public.downtime_catalog for insert with check (exists (select 1 from public.company_memberships cm where cm.company_id=downtime_catalog.company_id and cm.user_id=auth.uid()))';
    execute 'create policy downtime_catalog_company_update on public.downtime_catalog for update using (exists (select 1 from public.company_memberships cm where cm.company_id=downtime_catalog.company_id and cm.user_id=auth.uid())) with check (exists (select 1 from public.company_memberships cm where cm.company_id=downtime_catalog.company_id and cm.user_id=auth.uid()))';
    execute 'create policy downtime_catalog_company_delete on public.downtime_catalog for delete using (exists (select 1 from public.company_memberships cm where cm.company_id=downtime_catalog.company_id and cm.user_id=auth.uid()))';
  else
    raise exception 'Expected table public.company_memberships was not found. Stop: inspect SECURITY_MAP before creating Catalog RLS policies.';
  end if;
end $$;
