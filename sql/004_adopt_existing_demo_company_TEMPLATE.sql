-- GUVEL OPERATIONAL — PHASE 1.2
-- Adopt an existing manually-created company after creating your login account.
-- Replace YOUR_LOGIN_EMAIL with the exact email used in GUVEL Operational.

insert into public.company_members (company_id, user_id, role, is_active)
select c.id, u.id, 'owner', true
from public.companies c
join auth.users u on lower(u.email) = lower('YOUR_LOGIN_EMAIL')
where c.code = 'GUVEL-DEMO'
on conflict (company_id,user_id)
do update set role = 'owner', is_active = true;

-- Verify membership
select c.name, c.code, cm.role, cm.is_active, u.email
from public.company_members cm
join public.companies c on c.id = cm.company_id
join auth.users u on u.id = cm.user_id
where lower(u.email) = lower('YOUR_LOGIN_EMAIL');
