-- GUVEL Operational — Phase 2.3.B
-- Company Roles & Permissions foundation

begin;

-- Normalize the company membership role vocabulary.
update public.company_members
set role = 'viewer'
where role = 'operator';

alter table public.company_members
  drop constraint if exists company_members_role_check;

alter table public.company_members
  add constraint company_members_role_check
  check (role in ('owner','admin','manager','supervisor','viewer'));

-- Secure role change: only Owner/Admin can change another member's role.
-- The Owner role cannot be assigned through this function and the current
-- user's own membership cannot be changed through this function.
create or replace function public.change_company_member_role(
  target_member_id uuid,
  target_role text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_company uuid;
  actor_role text;
begin
  if target_role not in ('admin','manager','supervisor','viewer') then
    raise exception 'Invalid target role';
  end if;

  select cm.company_id
    into target_company
  from public.company_members cm
  where cm.id = target_member_id
    and cm.is_active = true;

  if target_company is null then
    raise exception 'Membership not found';
  end if;

  select cm.role
    into actor_role
  from public.company_members cm
  where cm.company_id = target_company
    and cm.user_id = auth.uid()
    and cm.is_active = true;

  if actor_role not in ('owner','admin') then
    raise exception 'Insufficient permissions';
  end if;

  if exists (
    select 1
    from public.company_members cm
    where cm.id = target_member_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You cannot change your own role';
  end if;

  update public.company_members
  set role = target_role
  where id = target_member_id
    and company_id = target_company
    and role <> 'owner';

  return found;
end;
$$;

revoke all on function public.change_company_member_role(uuid, text) from public;
grant execute on function public.change_company_member_role(uuid, text) to authenticated;

commit;
notify pgrst, 'reload schema';
