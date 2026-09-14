-- GUVEL OPERATIONAL — PHASE 1.6.2
-- OPERATIONAL PROFILE RECONCILIATION
-- Run after inspecting affected tables and existing RLS.
-- No existing relationship table is removed.

begin;

-- Operations are now configured from the Part Number Profile.
-- Machine-specific cycle times are authoritative in operation_machine_cycle_times.
-- Therefore this legacy column must not block operation creation.
alter table public.operations
  alter column ideal_cycle_time_seconds drop not null;

-- Keep legacy column for backward compatibility. Do NOT drop it.

commit;

-- POST-MIGRATION INSPECTION (run separately if desired)
-- select column_name,is_nullable,column_default
-- from information_schema.columns
-- where table_schema='public' and table_name='operations'
-- and column_name='ideal_cycle_time_seconds';
