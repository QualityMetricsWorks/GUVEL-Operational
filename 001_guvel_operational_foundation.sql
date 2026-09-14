-- GUVEL OPERATIONAL — FOUNDATION v1.0
-- Single Source of Truth / Multi-company ready / No authentication required yet
create extension if not exists pgcrypto;

create table if not exists companies (
 id uuid primary key default gen_random_uuid(), name text not null, code text not null unique, created_at timestamptz not null default now()
);
create table if not exists customers (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references companies(id) on delete cascade, code text not null, name text not null, created_at timestamptz not null default now(), unique(company_id,code)
);
create table if not exists part_numbers (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references companies(id) on delete cascade, customer_id uuid not null references customers(id) on delete restrict, part_number text not null, description text, piece_cost numeric(14,4) not null default 0 check(piece_cost>=0), scrap_cost numeric(14,4) not null default 0 check(scrap_cost>=0), created_at timestamptz not null default now(), unique(company_id,part_number)
);
create table if not exists machines (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references companies(id) on delete cascade, brand text, code text not null, name text not null, created_at timestamptz not null default now(), unique(company_id,code)
);
create table if not exists operations (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references companies(id) on delete cascade, part_number_id uuid not null references part_numbers(id) on delete cascade, operation_number text not null, operation_name text, ideal_cycle_time_seconds numeric(14,4) not null check(ideal_cycle_time_seconds>0), unique(part_number_id,operation_number)
);
create table if not exists part_number_machines (
 part_number_id uuid not null references part_numbers(id) on delete cascade, machine_id uuid not null references machines(id) on delete cascade, primary key(part_number_id,machine_id)
);
create table if not exists shifts (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references companies(id) on delete cascade, code text not null, name text not null, start_time time not null, end_time time not null, excluded_planned_minutes numeric(10,2) not null default 0 check(excluded_planned_minutes>=0), unique(company_id,code)
);
create table if not exists scrap_catalog (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references companies(id) on delete cascade, part_number_id uuid not null references part_numbers(id) on delete cascade, operation_id uuid not null references operations(id) on delete cascade, code text not null, defect text not null, category text not null check(category in ('Dimensional','Visual','Material','Process')), unique(company_id,part_number_id,operation_id,code)
);
create table if not exists downtime_catalog (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references companies(id) on delete cascade, code text not null, downtime text not null, category text not null check(category in ('Machine','Tooling','Quality','Setup','Personnel','Logistics','Material')), unique(company_id,code)
);

-- Transaction header = one controlled capture. Registers are views, not duplicate data.
create table if not exists production_captures (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references companies(id) on delete cascade, captured_at timestamptz not null default now(), production_date date not null default current_date, shift_id uuid not null references shifts(id) on delete restrict, lot_number text not null, customer_id uuid not null references customers(id) on delete restrict, part_number_id uuid not null references part_numbers(id) on delete restrict, machine_id uuid not null references machines(id) on delete restrict, operation_id uuid not null references operations(id) on delete restrict, operator_name text, supervisor_name text, production_quantity integer not null check(production_quantity>=0), confirmed boolean not null default false, confirmed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists scrap_events (
 id uuid primary key default gen_random_uuid(), production_capture_id uuid not null references production_captures(id) on delete cascade, company_id uuid not null references companies(id) on delete cascade, scrap_catalog_id uuid not null references scrap_catalog(id) on delete restrict, quantity integer not null check(quantity>0), reason text, created_at timestamptz not null default now()
);
create table if not exists downtime_events (
 id uuid primary key default gen_random_uuid(), production_capture_id uuid not null references production_captures(id) on delete cascade, company_id uuid not null references companies(id) on delete cascade, downtime_catalog_id uuid not null references downtime_catalog(id) on delete restrict, minutes numeric(12,2) not null check(minutes>0), reason text, event_type text not null check(event_type in ('Planned','Unplanned')), created_at timestamptz not null default now()
);

create index if not exists idx_part_numbers_company on part_numbers(company_id);
create index if not exists idx_captures_company_date on production_captures(company_id,production_date);
create index if not exists idx_scrap_capture on scrap_events(production_capture_id);
create index if not exists idx_downtime_capture on downtime_events(production_capture_id);

-- Register views: always read from transactional source of truth.
create or replace view register_production as
select pc.id,pc.company_id,pc.captured_at,pc.production_date,s.code as shift,pc.lot_number,c.name as customer,p.part_number,o.operation_number,pc.production_quantity,
coalesce(sum(se.quantity),0) as scrap_quantity,
case when pc.production_quantity=0 then null else round((pc.production_quantity-coalesce(sum(se.quantity),0))::numeric/pc.production_quantity*100,2) end as yield_percent
from production_captures pc join shifts s on s.id=pc.shift_id join customers c on c.id=pc.customer_id join part_numbers p on p.id=pc.part_number_id join operations o on o.id=pc.operation_id left join scrap_events se on se.production_capture_id=pc.id
group by pc.id,s.code,c.name,p.part_number,o.operation_number;

create or replace view register_scrap as
select se.id,se.company_id,pc.captured_at,s.code as shift,pc.lot_number,c.name as customer,p.part_number,o.operation_number,sc.defect,se.quantity,round(se.quantity*p.scrap_cost,2) as cost
from scrap_events se join production_captures pc on pc.id=se.production_capture_id join shifts s on s.id=pc.shift_id join customers c on c.id=pc.customer_id join part_numbers p on p.id=pc.part_number_id join operations o on o.id=pc.operation_id join scrap_catalog sc on sc.id=se.scrap_catalog_id;

create or replace view register_downtime as
select de.id,de.company_id,pc.captured_at,s.code as shift,c.name as customer,p.part_number,m.code as machine,dc.downtime,de.event_type,de.minutes
from downtime_events de join production_captures pc on pc.id=de.production_capture_id join shifts s on s.id=pc.shift_id join customers c on c.id=pc.customer_id join part_numbers p on p.id=pc.part_number_id join machines m on m.id=pc.machine_id join downtime_catalog dc on dc.id=de.downtime_catalog_id;

-- SECURITY NOTE: RLS is intentionally deferred until authentication/company membership is implemented.
-- Before production deployment with real customers, enable RLS and add membership-based policies.
