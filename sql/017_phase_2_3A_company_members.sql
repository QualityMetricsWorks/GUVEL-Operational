-- GUVEL Operational — Phase 2.3.A — Company Members List
-- Run after Phase 2.2 Company Tenant Provisioning.
begin;

create or replace function public.get_company_users(target_company_id uuid)
returns table(
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  role text,
  is_active boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    cm.id,
    cm.user_id,
    coalesce(nullif(trim(p.full_name), ''), split_part(au.email, '@', 1), 'User') as full_name,
    coalesce(au.email, '') as email,
    cm.role,
    cm.is_active,
    cm.created_at
  from public.company_members cm
  left join public.profiles p on p.id = cm.user_id
  left join auth.users au on au.id = cm.user_id
  where cm.company_id = target_company_id
    and exists (
      select 1
      from public.company_members viewer
      where viewer.company_id = target_company_id
        and viewer.user_id = auth.uid()
        and viewer.is_active = true
    )
  order by cm.created_at asc;
$$;

revoke all on function public.get_company_users(uuid) from public;
grant execute on function public.get_company_users(uuid) to authenticated;

commit;

notify pgrst, 'reload schema';

-- Validation:
-- select * from public.get_company_users('<COMPANY_UUID>');
