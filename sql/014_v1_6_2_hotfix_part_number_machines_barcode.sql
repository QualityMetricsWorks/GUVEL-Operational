-- GUVEL Operational — v1.6.2 Hotfix
-- Part Number ↔ Machine schema reconciliation + barcode application fix
-- PRECONDITION: inspect actual part_number_machines schema and policies before execution.

begin;

-- The application must NOT assume company_id exists in part_number_machines.
-- Enforce one relationship per Part Number + Machine.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'part_number_machines_part_number_machine_key'
      and conrelid = 'public.part_number_machines'::regclass
  ) then
    alter table public.part_number_machines
      add constraint part_number_machines_part_number_machine_key
      unique (part_number_id, machine_id);
  end if;
end $$;

commit;

-- INSPECTION (run separately if needed):
-- select column_name,data_type,is_nullable
-- from information_schema.columns
-- where table_schema='public' and table_name='part_number_machines'
-- order by ordinal_position;
--
-- select tablename,policyname,cmd,roles,qual,with_check
-- from pg_policies
-- where schemaname='public' and tablename='part_number_machines';
