-- GUVEL Operational — Phase 2.3.C
-- Adds the invited display name and a 4-argument invitation RPC.
-- Run only after reviewing the existing company_invitations schema.

begin;

alter table if exists public.company_invitations
  add column if not exists invited_name text;

create or replace function public.create_company_invitation(
  target_company_id uuid,
  target_name text,
  target_email text,
  target_role text
)
returns table(
  invitation_id uuid,
  invitation_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_role text;
  new_id uuid;
  new_token text;
  expiry timestamptz := now() + interval '7 days';
begin
  select cm.role into caller_role
  from public.company_members cm
  where cm.company_id = target_company_id
    and cm.user_id = auth.uid()
    and cm.is_active = true;

  if caller_role not in ('owner','admin') then
    raise exception 'Only Owner or Admin can create invitations';
  end if;

  if lower(trim(target_role)) not in ('admin','manager','supervisor','viewer') then
    raise exception 'Invalid invitation role';
  end if;

  if nullif(trim(target_name),'') is null then
    raise exception 'Invitee name is required';
  end if;

  if nullif(trim(target_email),'') is null then
    raise exception 'Invitee email is required';
  end if;

  new_token := encode(gen_random_bytes(32), 'hex');

  insert into public.company_invitations(
    company_id, email, role, status, token, expires_at, invited_name
  ) values (
    target_company_id, lower(trim(target_email)), lower(trim(target_role)),
    'pending', new_token, expiry, trim(target_name)
  ) returning id into new_id;

  return query select new_id, new_token, expiry;
end;
$$;

revoke all on function public.create_company_invitation(uuid,text,text,text) from public;
grant execute on function public.create_company_invitation(uuid,text,text,text) to authenticated;

commit;
notify pgrst, 'reload schema';
