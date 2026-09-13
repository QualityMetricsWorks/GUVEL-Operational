# GUVEL Operational — Phase 2.3.D

## Purpose
Adds a frontend **Company Administration** module restricted by the Supabase RPC `is_guvel_platform_super_admin()`.

## Included
- Company Administration navigation entry.
- Super Admin gate before rendering administrative content.
- Create company form using `create_company_for_current_user()`.
- Existing companies list.
- No change to GitHub Pages, Supabase, Cloudflare, Hostinger or Resend architecture.

## Deployment
1. Replace `js/app.js` in the GitHub repository.
2. Commit and push.
3. Wait for GitHub Pages deployment.
4. Hard refresh the portal (`Ctrl + F5`).
5. Sign in with the configured GUVEL Platform Super Admin account.
6. Open **Company Administration**.

## Required SQL
The corrected `create_company_for_current_user(text,text,text)` function from Phase 2.3.C must already exist and use `created_by`, not `owner_user_id`.

## Expected behavior
- Super Admin: can open Company Administration and create tenants.
- Normal Owner/Admin: cannot pass the RPC gate and cannot create tenants.
- User without company membership: remains in Access Pending.
