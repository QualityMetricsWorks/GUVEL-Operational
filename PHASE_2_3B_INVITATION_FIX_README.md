# GUVEL Operational — Invitation Confirmation Fix

This hotfix fixes the invitation flow after Supabase email confirmation.

## Problem

After a new invited user confirmed their email, the application could lose the invitation context and send the user to **Company Setup**.

## Fix

- The invitation token remains in localStorage during signup.
- The email confirmation redirect preserves the invitation query parameter.
- When a confirmed session is detected, the app attempts to accept the pending invitation before showing Company Setup.
- Company Setup is now only shown when the authenticated user truly has no active company membership and no pending invitation.

## Deployment

1. Replace `js/app.js` in GitHub.
2. Commit and wait for GitHub Pages to publish.
3. Use a fresh invitation token for testing.

## Important

The invited user must use the same email address that received the invitation. If the email is already registered, use the login option from the invitation screen instead of creating a second account.
