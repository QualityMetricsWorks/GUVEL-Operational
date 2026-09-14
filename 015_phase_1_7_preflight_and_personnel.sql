-- GUVEL Operational — Phase 1.7
-- Capture Foundation & Personnel Module
-- Architecture preflight + additive personnel table.
-- Run in Supabase SQL Editor.

-- 1. INSPECT REAL DATABASE TABLES AFFECTED
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in ('personnel','production_captures','company_members','companies','part_numbers','machines','operations','shifts')
order by table_name;

-- 2. INSPECT COLUMNS
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public'
  and table_name in ('production_captures','company_members','part_numbers','machines','operations','shifts')
order by table_name,ordinal_position;

-- 3. INSPECT EXISTING RLS
select c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
and c.relname in ('production_captures','company_members','part_numbers','machines','operations','shifts','personnel')
order by c.relname;

-- 4. INSPECT POLICIES
select tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public'
and tablename in ('production_captures','company_members','part_numbers','machines','operations','shifts','personnel')
order by tablename,policyname;

-- 5. ADDITIVE PERSONNEL FOUNDATION
create table if not exists public.personnel (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id text not null,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('Supervisor','Operator')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personnel_company_employee_key unique (company_id,employee_id)
);

alter table public.personnel enable row level security;

-- SECURITY_MAP baseline uses public.is_company_member(company_id).
drop policy if exists personnel_company_select on public.personnel;
drop policy if exists personnel_company_insert on public.personnel;
drop policy if exists personnel_company_update on public.personnel;
drop policy if exists personnel_company_delete on public.personnel;

create policy personnel_company_select on public.personnel for select to authenticated
using (public.is_company_member(company_id));
create policy personnel_company_insert on public.personnel for insert to authenticated
with check (public.is_company_member(company_id));
create policy personnel_company_update on public.personnel for update to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));
create policy personnel_company_delete on public.personnel for delete to authenticated
using (public.is_company_member(company_id));

create index if not exists personnel_company_role_active_idx
on public.personnel(company_id,role,is_active);

-- POST-FLIGHT: verify new table and policies
select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='personnel'
order by ordinal_position;

select tablename,policyname,cmd,qual,with_check
from pg_policies
where schemaname='public' and tablename='personnel'
order by policyname;
