create unique index if not exists facebook_leads_page_ref_unique
  on public.external_integrations (external_account_ref)
  where slug = 'facebook-leads' and external_account_ref is not null;

create table if not exists public.facebook_lead_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid references public.external_integrations(id) on delete set null,
  external_lead_id text not null,
  page_id text not null,
  form_id text,
  ad_id text,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  raw_payload jsonb not null default '{}'::jsonb,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (organization_id, external_lead_id)
);

create index if not exists facebook_lead_events_org_received_idx
  on public.facebook_lead_events (organization_id, received_at desc);
create index if not exists facebook_lead_events_status_idx
  on public.facebook_lead_events (organization_id, status, received_at desc);

alter table public.facebook_lead_events enable row level security;

comment on table public.facebook_lead_events is 'Server-side deduplication and delivery ledger for Meta/Facebook lead webhook events.';
