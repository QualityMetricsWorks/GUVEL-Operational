GUVEL Operational — Phase 2.2
Company / Tenant Provisioning Foundation

STATUS
PACKAGE PREPARED — DO NOT EXECUTE FRONTEND DEPLOYMENT BEFORE SQL MIGRATION.

WHAT THIS PHASE DOES
- Makes Company Setup a real tenant provisioning flow.
- Adds Company Subdomain to the setup form.
- Checks tenant address availability before submission.
- Creates company + owner membership through a controlled RPC.
- Prevents reserved infrastructure hostnames from being used as tenants.
- Protects direct companies.subdomain changes with a database trigger.
- Routes Settings identity changes through an owner-only RPC.

INSTALL ORDER
1. Open Supabase SQL Editor.
2. Execute PHASE_2_2_COMPANY_TENANT_PROVISIONING.sql in full.
3. Verify the post-migration checks.
4. Deploy the frontend/Worker files from this package to the dedicated branch.
5. Do not change the existing Cloudflare DNS or Route.

IMPORTANT
- Do not delete the existing demo company.
- Do not change the existing operational.guvelsystems.com Custom Domain.
- Do not create individual customer Custom Domains.
- Do not add secrets to frontend or Worker files.

EXPECTED NEW SETUP FLOW
Create Account
  -> Email confirmation if enabled
  -> Company Setup
  -> Company Name
  -> Company Code
  -> Company Subdomain
  -> availability check
  -> Create Company & Continue
  -> Owner membership
  -> portal access

UAT SHOULD USE A NEW TEST ACCOUNT OR A CONTROLLED TEST SCENARIO.
Do not use the existing Owner account to test the no-membership Company Setup path.
