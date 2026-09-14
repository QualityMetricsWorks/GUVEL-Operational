# GUVEL Operational — Master Architecture v1.0

## Product purpose
A practical industrial system connecting production, quality and operational performance.

## Navigation
Dashboard: General | Production | Quality | Performance
Capture
Customers
Part Numbers
Machines
Catalog: Scrap | Downtime
Registers: Production | Scrap | Downtime
Settings: Shifts

## Core hierarchy
Company -> Customers -> Part Numbers -> Operations
Company -> Machines
Part Numbers <-> Machines
Part Number + Operation -> Scrap Catalog
Company -> Downtime Catalog
Company -> Shifts
Production Capture -> Scrap Events
Production Capture -> Downtime Events

## Dashboard definitions (to be implemented against the same source)
- Yield = Good Quantity / Production Quantity
- Good Quantity = Production Quantity - Scrap Quantity
- PPM = Scrap Quantity / Production Quantity * 1,000,000
- COPQ = sum(Scrap Quantity * Part Number Scrap Cost)
- Availability = Operating Time / Planned Production Time
- Performance = (Ideal Cycle Time * Total Quantity) / Operating Time
- OEE = Availability * Performance * Quality

Planned downtime and shift excluded time must be treated as excluded planned time. Unplanned downtime reduces operating time.

## Multi-company principle
Every tenant-owned record has `company_id`. Future authentication will map authenticated users to companies through a membership layer. No cross-company data query should be allowed once RLS is enabled.

## Development rule
No new table or module may be added without checking this document and the SQL schema first. The SQL schema is the technical source of truth; this document is the product/business source of truth.
