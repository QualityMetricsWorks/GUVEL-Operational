-- GUVEL Operational v1.4.1
-- Non-destructive Part Numbers repair.
-- Confirmed field: piece_cost (not cost_per_piece).

create index if not exists idx_part_numbers_company_part_number
on public.part_numbers(company_id, part_number);

create index if not exists idx_part_numbers_customer_id
on public.part_numbers(customer_id);

-- No columns, IDs, foreign keys or RLS policies are changed here.
