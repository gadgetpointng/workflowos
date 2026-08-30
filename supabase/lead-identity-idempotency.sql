-- WorkflowOS lead identity hardening.
-- This file is intentionally not auto-applied by application deploys. Apply only as part
-- of the coordinated Buyer Acquisition release after exact-head runtime compatibility
-- checks are green.
--
-- Phone normalization is deliberately conservative: punctuation/spacing is removed, but
-- no country code is inferred or rewritten. Email normalization only trims and lowercases.

alter table public.leads
  add column if not exists normalized_phone text
    generated always as (nullif(regexp_replace(phone, '[^0-9]+', '', 'g'), '')) stored;

alter table public.leads
  add column if not exists normalized_email text
    generated always as (nullif(lower(btrim(email)), '')) stored;

-- PostgreSQL unique indexes allow multiple NULL values, so leads without a phone/email
-- remain valid while normalized identities become race-safe within each organization.
create unique index if not exists leads_org_normalized_phone_unique
  on public.leads (organization_id, normalized_phone);

create unique index if not exists leads_org_normalized_email_unique
  on public.leads (organization_id, normalized_email);

comment on column public.leads.normalized_phone is
  'Generated conservative phone identity for organization-scoped lead deduplication; digits only, no country-code inference.';

comment on column public.leads.normalized_email is
  'Generated normalized email identity for organization-scoped lead deduplication; trimmed and lowercased.';
