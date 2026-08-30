-- Coordinated rollback for lead identity idempotency schema only.
-- Run only if the paired lead-identity release must be reversed.
-- This intentionally removes only the two normalized identity indexes and generated columns.

drop index if exists public.leads_org_normalized_phone_unique;
drop index if exists public.leads_org_normalized_email_unique;

alter table public.leads
  drop column if exists normalized_phone,
  drop column if exists normalized_email;
