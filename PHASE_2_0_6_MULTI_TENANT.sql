-- GUVEL Operational — Phase 2.0.6
-- Multi-Tenant Domain & Company Routing
-- Additive migration. No operational data changes.

begin;

-- companies.subdomain was introduced in Phase 2.0.1. Reassert its presence only if needed.
alter table public.companies add column if not exists subdomain text;

-- Canonical subdomain format. NULL is allowed for existing companies until configured.
alter table public.companies drop constraint if exists companies_subdomain_format_check;
alter table public.companies add constraint companies_subdomain_format_check
check (subdomain is null or subdomain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$');

create unique index if not exists companies_subdomain_unique_idx
on public.companies (lower(subdomain))
where subdomain is not null;

-- Safe public resolver: returns only company identity fields needed for tenant routing.
create or replace function public.resolve_company_subdomain(target_subdomain text)
returns table (id uuid, name text, code text, subdomain text)
language sql
security definer
set search_path = public
as $$
  select c.id, c.name, c.code, c.subdomain
  from public.companies c
  where lower(c.subdomain) = lower(trim(target_subdomain))
    and c.subdomain is not null
  limit 1;
$$;

revoke all on function public.resolve_company_subdomain(text) from public;
grant execute on function public.resolve_company_subdomain(text) to anon, authenticated;

commit;

-- Validation only:
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='companies' and column_name='subdomain';

select indexname, indexdef
from pg_indexes
where schemaname='public' and indexname='companies_subdomain_unique_idx';

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid='public.companies'::regclass
  and conname='companies_subdomain_format_check';
