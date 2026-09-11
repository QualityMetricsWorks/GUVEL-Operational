GUVEL Operational — Phase 2.2 Hotfix 1
=====================================
Purpose: allow an existing company Owner to create an additional company from Settings.

Backend:
- Adds create_company_for_owner(source_company_id, target_name, target_code, target_subdomain).
- Requires authenticated caller to be Owner of source_company_id.
- Creates target company and owner membership atomically.
- Preserves create_company_for_current_user() onboarding restriction.
- Adds global unique index companies_code_uq for company-code uniqueness.

Frontend:
- Settings > Company Identity now shows “＋ Create New Company” for Owner only.
- Opens a GUVEL modal with company name, code, subdomain and live subdomain availability.
- New company is created without switching the active company.
- New tenant is immediately reachable through its subdomain after Cloudflare routing.

Security:
- No service key, auth secret or direct company_members insert from browser.
- RLS remains authoritative.
- Existing company remains active after creation.
