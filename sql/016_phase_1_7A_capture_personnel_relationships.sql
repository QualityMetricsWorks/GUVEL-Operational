-- GUVEL Operational — Phase 1.7.A
-- Capture Relationship Completion
-- Additive migration only. Existing operator_name/supervisor_name remain for compatibility.

alter table public.production_captures
  add column if not exists operator_id uuid null,
  add column if not exists supervisor_id uuid null;

-- FK constraints are additive and only created if absent.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='production_captures_operator_id_fkey'
      and conrelid='public.production_captures'::regclass
  ) then
    alter table public.production_captures
      add constraint production_captures_operator_id_fkey
      foreign key (operator_id) references public.personnel(id)
      on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='production_captures_supervisor_id_fkey'
      and conrelid='public.production_captures'::regclass
  ) then
    alter table public.production_captures
      add constraint production_captures_supervisor_id_fkey
      foreign key (supervisor_id) references public.personnel(id)
      on delete set null;
  end if;
end $$;

create index if not exists production_captures_company_operator_idx
  on public.production_captures(company_id,operator_id);
create index if not exists production_captures_company_supervisor_idx
  on public.production_captures(company_id,supervisor_id);

-- Verify physical result
select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='production_captures'
order by ordinal_position;

select tc.constraint_name,kcu.column_name,ccu.table_name as foreign_table,ccu.column_name as foreign_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name=kcu.constraint_name and tc.table_schema=kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name=tc.constraint_name and ccu.table_schema=tc.table_schema
where tc.table_schema='public'
  and tc.table_name='production_captures'
  and tc.constraint_type='FOREIGN KEY'
  and kcu.column_name in ('operator_id','supervisor_id')
order by kcu.column_name;
