# GUVEL Operational
Single-source operational portal architecture for multi-company industrial data.

## Setup
1. Create a Supabase project.
2. Run `sql/001_schema.sql` in SQL Editor.
3. Copy `.env.example` to `.env` and add Supabase URL and anon key.
4. `npm install`
5. `npm run dev`

## Core principle
Every business table carries `company_id`. All future authentication and RLS policies must scope access through the user's company membership.

## OEE logic
Availability = (Scheduled Time - Unplanned Downtime) / Scheduled Time. Planned downtime is excluded from scheduled available time. Performance uses ideal cycle time from the linked operation. Quality uses good pieces / total pieces. OEE = Availability × Performance × Quality.
