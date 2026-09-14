-- GUVEL Operational — Phase 2.3.G
-- Secure platform invitation creation with hashed token storage.
-- Execute after the platform invitation RPC migration.

-- The live database function was created separately:
-- public.create_company_invitation_with_token_as_platform_admin(uuid,text,text,text)
-- This file documents the required contract for frontend and Edge Function.
-- The raw invitation token must never be stored in company_invitations.
