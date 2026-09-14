-- GUVEL OPERATIONAL v1.6 CORRECTED
-- PREFLIGHT ONLY — SAFE READ-ONLY INSPECTION
-- Run this first. It does not create, alter or delete anything.

-- 1. Confirm reconciled schemas
select table_name,column_name,data_type
from information_schema.columns
where table_schema='public'
and table_name in ('company_members','operations','scrap_catalog','downtime_catalog')
order by table_name,ordinal_position;

-- 2. Inspect existing RLS policies for affected tables
select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public'
and tablename in ('operations','scrap_catalog','downtime_catalog')
order by tablename,policyname;

-- 3. Confirm RLS is enabled status
select c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
and c.relname in ('operations','scrap_catalog','downtime_catalog')
order by c.relname;
