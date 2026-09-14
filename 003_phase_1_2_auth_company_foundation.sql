-- ============================================================
-- GUVEL OPERATIONAL — PHASE 1.2
-- AUTHENTICATION & COMPANY FOUNDATION
-- Non-destructive migration from Foundation v1.0 / Phase 1.1
-- ============================================================

create extension if not exists pgcrypto;

-- 1. USER PROFILE (1:1 with Supabase Auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. COMPANY MEMBERSHIP (many users may belong to one company;
--    one user may belong to multiple companies in the future)
create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','manager','operator','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,user_id)
);
create index if not exists idx_company_members_user on public.company_members(user_id);
create index if not exists idx_company_members_company on public.company_members(company_id);

-- 3. Preserve companies as the root entity. Add ownership metadata only.
alter table public.companies add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.companies add column if not exists updated_at timestamptz not null default now();

-- 4. Auto-create a profile for every new Auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 5. Existing users created before this migration may not have a profile.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data->>'full_name','')
from auth.users
on conflict (id) do nothing;

-- 6. Auto-link the creator of a NEW company as owner.
create or replace function public.handle_company_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.company_members (company_id, user_id, role, is_active)
    values (new.id, new.created_by, 'owner', true)
    on conflict (company_id,user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_company_created on public.companies;
create trigger on_company_created
after insert on public.companies
for each row execute procedure public.handle_company_created();

-- 7. Helper functions used by RLS. Security Definer avoids policy recursion.
create or replace function public.is_company_member(target_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  );
$$;

create or replace function public.is_company_owner(target_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role = 'owner'
  );
$$;

-- 8. Remove the temporary anonymous Shift policies created during Phase 1.1.
drop policy if exists "development_select_shifts" on public.shifts;
drop policy if exists "development_insert_shifts" on public.shifts;
drop policy if exists "development_update_shifts" on public.shifts;
drop policy if exists "development_delete_shifts" on public.shifts;

-- 9. Enable RLS on all current base tables.
alter table public.profiles enable row level security;
alter table public.company_members enable row level security;
alter table public.companies enable row level security;
alter table public.customers enable row level security;
alter table public.part_numbers enable row level security;
alter table public.machines enable row level security;
alter table public.operations enable row level security;
alter table public.part_number_machines enable row level security;
alter table public.shifts enable row level security;
alter table public.scrap_catalog enable row level security;
alter table public.downtime_catalog enable row level security;
alter table public.production_captures enable row level security;
alter table public.scrap_events enable row level security;
alter table public.downtime_events enable row level security;

-- 10. Profiles policies.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 11. Membership policies: users can read their own memberships.
drop policy if exists company_members_select_own on public.company_members;
create policy company_members_select_own on public.company_members for select to authenticated using (user_id = auth.uid());

-- 12. Company policies. Authenticated users may create a company; trigger creates owner membership.
drop policy if exists companies_select_member on public.companies;
drop policy if exists companies_insert_authenticated on public.companies;
drop policy if exists companies_update_owner on public.companies;
drop policy if exists companies_delete_owner on public.companies;
create policy companies_select_member on public.companies for select to authenticated using (public.is_company_member(id));
create policy companies_insert_authenticated on public.companies for insert to authenticated with check (created_by = auth.uid());
create policy companies_update_owner on public.companies for update to authenticated using (public.is_company_owner(id)) with check (public.is_company_owner(id));
create policy companies_delete_owner on public.companies for delete to authenticated using (public.is_company_owner(id));

-- 13. Company-scoped tables. Same pattern: authenticated active member only.
-- Existing relationships are preserved. No company_id is renamed or removed.

do $$
declare t text;
begin
  foreach t in array array['customers','part_numbers','machines','operations','shifts','scrap_catalog','downtime_catalog','production_captures']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_company_select', t);
    execute format('drop policy if exists %I on public.%I', t||'_company_insert', t);
    execute format('drop policy if exists %I on public.%I', t||'_company_update', t);
    execute format('drop policy if exists %I on public.%I', t||'_company_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_company_member(company_id))', t||'_company_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_company_member(company_id))', t||'_company_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))', t||'_company_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_company_member(company_id))', t||'_company_delete', t);
  end loop;
end $$;

-- 14. Event tables inherit company access through their own preserved company_id.
do $$
declare t text;
begin
  foreach t in array array['scrap_events','downtime_events']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_company_select', t);
    execute format('drop policy if exists %I on public.%I', t||'_company_insert', t);
    execute format('drop policy if exists %I on public.%I', t||'_company_update', t);
    execute format('drop policy if exists %I on public.%I', t||'_company_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_company_member(company_id))', t||'_company_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_company_member(company_id))', t||'_company_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))', t||'_company_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_company_member(company_id))', t||'_company_delete', t);
  end loop;
end $$;

-- 15. Join table policy. Access is derived from linked part number and machine.
drop policy if exists part_number_machines_select_member on public.part_number_machines;
drop policy if exists part_number_machines_write_member on public.part_number_machines;
create policy part_number_machines_select_member on public.part_number_machines
for select to authenticated using (
  exists (select 1 from public.part_numbers p where p.id = part_number_id and public.is_company_member(p.company_id))
);
create policy part_number_machines_write_member on public.part_number_machines
for all to authenticated using (
  exists (select 1 from public.part_numbers p where p.id = part_number_id and public.is_company_member(p.company_id))
) with check (
  exists (select 1 from public.part_numbers p where p.id = part_number_id and public.is_company_member(p.company_id))
);

-- ============================================================
-- EXISTING COMPANY ADOPTION (RUN ONLY AFTER YOU CREATE AN ACCOUNT)
-- For the already-created GUVEL Demo Company, run this separately:
--
-- insert into public.company_members (company_id, user_id, role, is_active)
-- select c.id, u.id, 'owner', true
-- from public.companies c
-- join auth.users u on lower(u.email) = lower('YOUR_LOGIN_EMAIL')
-- where c.code = 'GUVEL-DEMO'
-- on conflict (company_id,user_id) do update set role='owner', is_active=true;
-- ============================================================
