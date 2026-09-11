GUVEL Operational — Phase 2.0.6
Multi-Tenant Domain & Company Routing

BASELINE
- Phase 2.0.5 HOTFIX 2 validated.
- Production portal: https://operational.guvelsystems.com/
- Corporate site: https://guvelsystems.com/
- GitHub Pages remains technical fallback/development.

SCOPE
- Company subdomain identity using companies.subdomain.
- Unique, validated subdomains.
- Tenant routing from *.guvelsystems.com.
- Tenant membership validation before application access.
- Tenant-specific invitation links.
- Tenant-specific Supabase email redirect for invitation signup.
- Owner UI in Settings to maintain company subdomain.
- No Resend API key in frontend. Hostinger + Resend remains the next delivery phase.

IMPORTANT
- Run PHASE_2_0_6_MULTI_TENANT.sql once in Supabase.
- Configure DNS wildcard at Hostinger before expecting arbitrary customer subdomains to resolve.
- Keep operational.guvelsystems.com as the platform entry point.
- Existing company records with NULL subdomain remain valid until configured.
