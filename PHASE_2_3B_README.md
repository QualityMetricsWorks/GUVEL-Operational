# GUVEL Operational — Phase 2.3.B

## Company Roles & Permissions Foundation

This phase establishes the supported company membership roles:

- **Owner** — complete company control.
- **Admin** — administrative control, excluding Owner protection.
- **Manager** — operational management and invitations where enabled.
- **Supervisor** — operational capture and limited management.
- **Viewer** — read-only access.

## Supabase migration

Execute:

```text
sql/018_phase_2_3B_roles_permissions.sql
```

The migration:

1. Converts any legacy `operator` membership role to `viewer`.
2. Normalizes the allowed membership roles.
3. Creates the secure RPC `change_company_member_role`.
4. Prevents changing the Owner role through the role editor.
5. Prevents a user from changing their own role.
6. Restricts role changes to active Owner/Admin members.

## Validation

1. Execute the SQL in Supabase SQL Editor.
2. Confirm `Success`.
3. Enter GUVEL Operational as Owner.
4. Open **Users**.
5. Select a non-Owner member and choose **Change Role**.
6. Save a role such as `Manager`, `Supervisor`, or `Viewer`.
7. Confirm the table refreshes with the new role.

> This phase prepares the role security foundation. Module-by-module access restrictions will be implemented in subsequent permission blocks.
