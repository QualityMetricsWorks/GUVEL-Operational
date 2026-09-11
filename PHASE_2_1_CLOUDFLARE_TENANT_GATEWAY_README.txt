GUVEL Operational — Phase 2.1
Cloudflare Tenant Gateway

Purpose
-------
Convert the existing Cloudflare Static Assets deployment into a Worker + Static Assets deployment while preserving the current GUVEL Operational application and preparing wildcard tenant routing.

Current production hostname
--------------------------
https://operational.guvelsystems.com

New routing intent
------------------
*.guvelsystems.com/* -> the same GUVEL Operational Worker.

The Worker identifies the hostname class only:
- operational.guvelsystems.com -> platform application
- *.guvelsystems.com -> tenant application
- www.guvelsystems.com -> redirect to guvelsystems.com
- reserved first-level subdomains -> 404

Tenant identity and authorization are NOT implemented in the Worker. The application continues to resolve the tenant through the existing Phase 2.0.6 Supabase function resolve_company_subdomain(), and authorization remains enforced by Supabase Auth/RLS/RBAC.

Important
---------
This package is an infrastructure/application deployment change only. No new Supabase migration is required.

Pre-deployment safety
---------------------
1. Keep the existing operational.guvelsystems.com Custom Domain.
2. Do not add a wildcard Custom Domain.
3. Before enabling the wildcard Route, create a proxied wildcard DNS record for *.guvelsystems.com as required by Cloudflare Routes.
4. Deploy first from a non-main branch if possible.
5. Validate operational.guvelsystems.com before testing tenant hosts.
6. Keep the previous production deployment available for rollback.

Rollback
--------
If Phase 2.1 causes a production regression, restore the previous deployment/version and remove the wildcard Route. Do not change Supabase.
