-- GUVEL Operational — Phase 2.3.C Secure Invitation Delivery
-- Creates the server-side delivery contract used by the Resend Edge Function.
-- Do not store RESEND_API_KEY in SQL or frontend code.

begin;

alter table if exists public.company_invitations
  add column if not exists invited_name text;

-- The existing create_company_invitation RPC remains the source of truth for token creation.
-- This migration only documents the delivery contract and refreshes PostgREST.

commit;
notify pgrst, 'reload schema';
