-- GUVEL Operational — Phase 2.3.C
-- Platform-level company creation security
-- Only the GUVEL platform creator may create companies.

begin;

create table if not exists public.platform_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  platform_role text not null check (platform_role in ('super_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_users enable row level security;

drop policy if exists platform_users_select_self on public.platform_users;
create policy platform_users_select_self
  on public.platform_users for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_guvel_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_users pu
    where pu.user_id = auth.uid()
      and pu.platform_role = 'super_admin'
      and pu.is_active = true
  );
$$;

revoke all on function public.is_guvel_platform_super_admin() from public;
grant execute on function public.is_guvel_platform_super_admin() to authenticated;

insert into public.platform_users(user_id, platform_role, is_active)
values ('c70724a7-4e3d-4f77-ac79-b7bdeb8de161', 'super_admin', true)
on conflict (user_id) do update
set platform_role = excluded.platform_role,
    is_active = excluded.is_active,
    updated_at = now();

-- Only the global GUVEL Super Admin may create companies.
create or replace function public.create_company_for_current_user(
  target_name text,
  target_code text,
  target_subdomain text
)
returns table(id uuid, name text, code text, subdomain text, owner_user_id uuid)
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
  if not public.is_guvel_platform_super_admin() then
    raise exception 'Only the GUVEL Platform Super Admin can create companies.' using errcode = '42501';
  end if;
  if v_name = '' or length(v_name) > 120 then raise exception 'Company name is required.' using errcode = '22023'; end if;
  if v_code = '' or length(v_code) > 50 then raise exception 'Company code is required.' using errcode = '22023'; end if;
  if v_subdomain = '' or not public.is_company_subdomain_available(v_subdomain,null) then raise exception 'The requested company address is unavailable or reserved.' using errcode = '23505'; end if;
  if exists (select 1 from public.companies c where lower(c.code)=lower(v_code)) then raise exception 'Company code is already in use.' using errcode = '23505'; end if;
  insert into public.companies(name,code,subdomain,created_by)
  values(v_name,v_code,v_subdomain,v_user_id)
  returning companies.id into v_company_id;
  insert into public.company_members(company_id,user_id,role,is_active)
  values(v_company_id,v_user_id,'owner',true)
  on conflict(company_id,user_id) do update set role='owner',is_active=true,updated_at=now();
  return query select c.id,c.name,c.code,c.subdomain,v_user_id from public.companies c where c.id=v_company_id;
end;
$$;

revoke all on function public.create_company_for_current_user(text,text,text) from public;
grant execute on function public.create_company_for_current_user(text,text,text) to authenticated;

create or replace function public.create_company_for_owner(
  p_source_company_id uuid,
  target_name text,
  target_code text,
  target_subdomain text
)
returns table(id uuid, name text, code text, subdomain text, owner_user_id uuid, source_company_id uuid)
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
  if not public.is_guvel_platform_super_admin() then
    raise exception 'Only the GUVEL Platform Super Admin can create companies.' using errcode = '42501';
  end if;
  if v_name = '' or length(v_name) > 120 then raise exception 'Company name is required.' using errcode = '22023'; end if;
  if v_code = '' or length(v_code) > 50 then raise exception 'Company code is required.' using errcode = '22023'; end if;
  if v_subdomain = '' or not public.is_company_subdomain_available(v_subdomain,null) then raise exception 'The requested company address is unavailable or reserved.' using errcode = '23505'; end if;
  if exists (select 1 from public.companies c where lower(c.code)=lower(v_code)) then raise exception 'Company code is already in use.' using errcode = '23505'; end if;
  insert into public.companies(name,code,subdomain,created_by)
  values(v_name,v_code,v_subdomain,v_user_id)
  returning companies.id into v_company_id;
  insert into public.company_members(company_id,user_id,role,is_active)
  values(v_company_id,v_user_id,'owner',true)
  on conflict(company_id,user_id) do update set role='owner',is_active=true,updated_at=now();
  return query select c.id,c.name,c.code,c.subdomain,v_user_id,p_source_company_id from public.companies c where c.id=v_company_id;
end;
$$;

revoke all on function public.create_company_for_owner(uuid,text,text,text) from public;
grant execute on function public.create_company_for_owner(uuid,text,text,text) to authenticated;

-- Direct table inserts are also restricted to the platform creator.
drop policy if exists companies_insert_authenticated on public.companies;
drop policy if exists companies_insert_platform_super_admin on public.companies;
create policy companies_insert_platform_super_admin
  on public.companies for insert to authenticated
  with check (public.is_guvel_platform_super_admin() and created_by = auth.uid());

commit;
notify pgrst, 'reload schema';
