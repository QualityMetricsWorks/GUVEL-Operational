-- ============================================================================
-- GUVEL Operational — Phase 2.2
-- Company / Tenant Provisioning Foundation
-- ============================================================================
-- Additive migration. Does not recreate or repurpose existing tables.
-- Supabase Auth + company_members + RLS remain authoritative.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- 1) Reserved tenant hostnames
-- --------------------------------------------------------------------------
create or replace function public.is_reserved_company_subdomain(target_subdomain text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(trim(coalesce(target_subdomain,''))) = any(array[
    'www','operational','api','app','admin','support','status','mail','smtp','ftp','cdn'
  ]);
$$;

-- --------------------------------------------------------------------------
-- 2) Database-level company subdomain invariant
--    Prevents direct owner/API updates from bypassing provisioning rules.
-- --------------------------------------------------------------------------
create or replace function public.validate_company_subdomain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subdomain is null or trim(new.subdomain) = '' then
    return new;
  end if;

  new.subdomain := lower(trim(new.subdomain));

  if length(new.subdomain) > 63
     or new.subdomain !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$' then
    raise exception 'Invalid company subdomain. Use lowercase letters, numbers and internal hyphens only.'
      using errcode = '22023';
  end if;

  if public.is_reserved_company_subdomain(new.subdomain) then
    raise exception 'This company subdomain is reserved by GUVEL.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_company_subdomain on public.companies;
create trigger trg_validate_company_subdomain
before insert or update of subdomain on public.companies
for each row execute function public.validate_company_subdomain();

-- --------------------------------------------------------------------------
-- 3) Public-to-authenticated availability check
--    Returns only a boolean. It does not expose company records.
-- --------------------------------------------------------------------------
create or replace function public.is_company_subdomain_available(
  target_subdomain text,
  exclude_company_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when trim(coalesce(target_subdomain,'')) = '' then false
      when lower(trim(target_subdomain)) !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$' then false
      when public.is_reserved_company_subdomain(target_subdomain) then false
      else not exists (
        select 1
        from public.companies c
        where lower(c.subdomain) = lower(trim(target_subdomain))
          and (exclude_company_id is null or c.id <> exclude_company_id)
      )
    end;
$$;

revoke all on function public.is_company_subdomain_available(text,uuid) from public;
grant execute on function public.is_company_subdomain_available(text,uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 4) Atomic company provisioning for a newly authenticated user
--    The function creates the company and owner membership as one operation.
--    Existing trigger remains in place and is idempotent via ON CONFLICT.
-- --------------------------------------------------------------------------
create or replace function public.create_company_for_current_user(
  target_name text,
  target_code text,
  target_subdomain text
)
returns table(
  id uuid,
  name text,
  code text,
  subdomain text,
  owner_user_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_name text := trim(coalesce(target_name,''));
  v_code text := trim(coalesce(target_code,''));
  v_subdomain text := lower(trim(coalesce(target_subdomain,'')));
begin
  if v_user_id is null then
    raise exception 'Authentication is required to create a company.' using errcode = '28000';
  end if;

  if v_name = '' or length(v_name) > 120 then
    raise exception 'Company name is required and must not exceed 120 characters.' using errcode = '22023';
  end if;

  if v_code = '' or length(v_code) > 50 then
    raise exception 'Company code is required and must not exceed 50 characters.' using errcode = '22023';
  end if;

  if v_subdomain = '' or not public.is_company_subdomain_available(v_subdomain,null) then
    raise exception 'The requested company address is unavailable or reserved.' using errcode = '23505';
  end if;

  -- The Company Setup screen is specifically for an authenticated account
  -- that has not yet joined an active company.
  if exists (
    select 1 from public.company_members cm
    where cm.user_id = v_user_id and cm.is_active = true
  ) then
    raise exception 'Your account already has an active company membership.' using errcode = '42501';
  end if;

  if exists (select 1 from public.companies c where lower(c.code) = lower(v_code)) then
    raise exception 'Company code is already in use.' using errcode = '23505';
  end if;

  insert into public.companies(name,code,subdomain,created_by)
  values(v_name,v_code,v_subdomain,v_user_id)
  returning companies.id into v_company_id;

  -- Defensive/idempotent owner assignment. Existing on_company_created trigger
  -- normally creates this row already.
  insert into public.company_members(company_id,user_id,role,is_active)
  values(v_company_id,v_user_id,'owner',true)
  on conflict(company_id,user_id)
  do update set role='owner', is_active=true, updated_at=now();

  return query
  select c.id,c.name,c.code,c.subdomain,v_user_id
  from public.companies c
  where c.id=v_company_id;
end;
$$;

revoke all on function public.create_company_for_current_user(text,text,text) from public;
grant execute on function public.create_company_for_current_user(text,text,text) to authenticated;

-- --------------------------------------------------------------------------
-- 5) Owner-only identity update through a controlled RPC
-- --------------------------------------------------------------------------
create or replace function public.update_company_identity(
  target_company_id uuid,
  target_name text,
  target_code text,
  target_subdomain text
)
returns table(
  id uuid,
  name text,
  code text,
  subdomain text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(target_name,''));
  v_code text := trim(coalesce(target_code,''));
  v_subdomain text := lower(trim(coalesce(target_subdomain,'')));
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if not public.is_company_owner(target_company_id) then
    raise exception 'Only the company owner can change company identity.' using errcode = '42501';
  end if;

  if v_name='' or length(v_name)>120 then
    raise exception 'Company name is required and must not exceed 120 characters.' using errcode = '22023';
  end if;

  if v_code='' or length(v_code)>50 then
    raise exception 'Company code is required and must not exceed 50 characters.' using errcode = '22023';
  end if;

  if not public.is_company_subdomain_available(v_subdomain,target_company_id) then
    raise exception 'The requested company address is unavailable or reserved.' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.companies c
    where lower(c.code)=lower(v_code) and c.id<>target_company_id
  ) then
    raise exception 'Company code is already in use.' using errcode = '23505';
  end if;

  update public.companies
  set name=v_name, code=v_code, subdomain=v_subdomain, updated_at=now()
  where id=target_company_id;

  return query
  select c.id,c.name,c.code,c.subdomain
  from public.companies c
  where c.id=target_company_id;
end;
$$;

revoke all on function public.update_company_identity(uuid,text,text,text) from public;
grant execute on function public.update_company_identity(uuid,text,text,text) to authenticated;


-- --------------------------------------------------------------------------
-- 6) Owner-only additional company provisioning
--    Preserves the onboarding RPC contract: existing members cannot use
--    create_company_for_current_user(). Owners may create another tenant
--    explicitly from Settings while remaining in the current active company.
-- --------------------------------------------------------------------------
create or replace function public.create_company_for_owner(
  p_source_company_id uuid,
  target_name text,
  target_code text,
  target_subdomain text
)
returns table(
  id uuid,
  name text,
  code text,
  subdomain text,
  owner_user_id uuid,
  source_company_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_name text := trim(coalesce(target_name,''));
  v_code text := trim(coalesce(target_code,''));
  v_subdomain text := lower(trim(coalesce(target_subdomain,'')));
begin
  if v_user_id is null then
    raise exception 'Authentication is required to create a company.' using errcode = '28000';
  end if;

  if p_source_company_id is null or not public.is_company_owner(p_source_company_id) then
    raise exception 'Only the owner of the source company can create another company.' using errcode = '42501';
  end if;

  if v_name='' or length(v_name)>120 then
    raise exception 'Company name is required and must not exceed 120 characters.' using errcode = '22023';
  end if;

  if v_code='' or length(v_code)>50 then
    raise exception 'Company code is required and must not exceed 50 characters.' using errcode = '22023';
  end if;

  if v_subdomain='' or not public.is_company_subdomain_available(v_subdomain,null) then
    raise exception 'The requested company address is unavailable or reserved.' using errcode = '23505';
  end if;

  if exists (select 1 from public.companies c where lower(c.code)=lower(v_code)) then
    raise exception 'Company code is already in use.' using errcode = '23505';
  end if;

  insert into public.companies(name,code,subdomain,created_by)
  values(v_name,v_code,v_subdomain,v_user_id)
  returning companies.id into v_company_id;

  insert into public.company_members(company_id,user_id,role,is_active)
  values(v_company_id,v_user_id,'owner',true)
  on conflict(company_id,user_id)
  do update set role='owner', is_active=true, updated_at=now();

  return query
  select c.id,c.name,c.code,c.subdomain,v_user_id,p_source_company_id
  from public.companies c
  where c.id=v_company_id;
end;
$$;

revoke all on function public.create_company_for_owner(uuid,text,text,text) from public;
grant execute on function public.create_company_for_owner(uuid,text,text,text) to authenticated;

-- --------------------------------------------------------------------------
-- 7) Global company-code uniqueness invariant
-- --------------------------------------------------------------------------
create unique index if not exists companies_code_uq
  on public.companies (lower(code))
  where code is not null;

-- --------------------------------------------------------------------------
-- 8) Harden tenant resolution against reserved infrastructure names.
-- --------------------------------------------------------------------------
create or replace function public.resolve_company_subdomain(target_subdomain text)
returns table(id uuid, name text, code text, subdomain text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,c.name,c.code,c.subdomain
  from public.companies c
  where lower(c.subdomain)=lower(trim(target_subdomain))
    and not public.is_reserved_company_subdomain(c.subdomain)
  limit 1;
$$;

revoke all on function public.resolve_company_subdomain(text) from public;
grant execute on function public.resolve_company_subdomain(text) to anon, authenticated;

commit;

-- POST-MIGRATION VALIDATION
select public.is_company_subdomain_available('demo',null) as demo_available;
select public.is_company_subdomain_available('operational',null) as operational_available;
select public.is_company_subdomain_available('new-company',null) as new_company_available;
select id,name,code,subdomain from public.companies order by name;
