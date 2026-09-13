-- GUVEL Operational — Phase 2.3.E
-- Admin RPC for creating company invitations.
-- Requires the invitation table/function from Phase 2.3.C.

create or replace function public.create_company_invitation_as_platform_admin(
  p_company_id uuid,
  p_email text,
  p_full_name text,
  p_role text
)
returns public.company_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.company_invitations;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_guvel_platform_super_admin() then
    raise exception 'Only GUVEL platform super admin can create invitations';
  end if;

  if lower(trim(p_role)) not in ('owner','admin','supervisor','viewer') then
    raise exception 'Invalid invitation role';
  end if;

  if not exists (select 1 from public.companies c where c.id = p_company_id) then
    raise exception 'Company not found';
  end if;

  insert into public.company_invitations (
    company_id,
    email,
    full_name,
    role,
    invited_by
  )
  values (
    p_company_id,
    lower(trim(p_email)),
    trim(p_full_name),
    lower(trim(p_role)),
    auth.uid()
  )
  returning * into v_invitation;

  return v_invitation;
end;
$$;

revoke all on function public.create_company_invitation_as_platform_admin(uuid,text,text,text) from public;
grant execute on function public.create_company_invitation_as_platform_admin(uuid,text,text,text) to authenticated;
