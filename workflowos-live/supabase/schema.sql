create extension if not exists "pgcrypto";

create type user_role as enum ('owner','admin','manager','marketing','sales','staff');
create type task_status as enum ('draft','assigned','accepted','in_progress','submitted','approved','completed','rejected','cancelled');
create type priority_level as enum ('low','medium','high','urgent');
create type campaign_status as enum ('draft','planned','active','paused','completed','cancelled');
create type lead_status as enum ('new','contacted','interested','negotiating','purchased','lost','repeat_customer');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  email text,
  role user_role not null default 'staff',
  department text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  creator_id uuid references profiles(id),
  assignee_id uuid references profiles(id),
  department text,
  priority priority_level not null default 'medium',
  status task_status not null default 'draft',
  due_at timestamptz,
  completion_notes text,
  completion_evidence_url text,
  approval_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_checklists (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  item text not null,
  completed boolean not null default false,
  position integer not null default 0
);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  objective text,
  target_audience text,
  status campaign_status not null default 'draft',
  budget numeric(14,2),
  starts_at timestamptz,
  ends_at timestamptz,
  owner_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaign_tasks (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  primary key (campaign_id, task_id)
);

create table marketing_content (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  title text,
  body text,
  media_url text,
  channel text not null,
  status text not null default 'draft',
  scheduled_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text,
  phone text,
  email text,
  source text,
  product_interest text,
  status lead_status not null default 'new',
  assigned_to uuid references profiles(id),
  estimated_value numeric(14,2),
  last_contacted_at timestamptz,
  next_followup_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  actor_id uuid references profiles(id),
  activity_type text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  target_value numeric(14,2),
  current_value numeric(14,2) not null default 0,
  metric text,
  starts_at timestamptz,
  ends_at timestamptz,
  owner_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table marketplaces (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  active boolean not null default true
);

create table marketplace_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  marketplace_id uuid not null references marketplaces(id) on delete cascade,
  status text not null default 'disconnected',
  external_account_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, marketplace_id)
);

create table marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  marketplace_id uuid not null references marketplaces(id) on delete cascade,
  external_listing_id text,
  local_product_ref text,
  title text,
  price numeric(14,2),
  quantity integer,
  status text not null default 'draft',
  external_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  category text,
  content text,
  file_url text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  recipient_id uuid references profiles(id) on delete cascade,
  title text not null,
  body text,
  type text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into marketplaces (name, slug) values
('Jumia','jumia'), ('Jiji','jiji'), ('Konga','konga')
on conflict (slug) do nothing;

-- Production note:
-- Enable Row Level Security on all organization-scoped tables and add policies
-- based on the authenticated user's profile.organization_id and role.
-- Do not use the Supabase service-role key in browser code.

-- V1.2 operational layer
create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  requested_by uuid references profiles(id),
  approver_id uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_tasks_org_status on tasks(organization_id,status);
create index if not exists idx_tasks_assignee on tasks(assignee_id,status);
create index if not exists idx_leads_org_status on leads(organization_id,status);
create index if not exists idx_leads_followup on leads(next_followup_at) where next_followup_at is not null;
create index if not exists idx_notifications_recipient on notifications(recipient_id,read_at,created_at desc);

-- WorkflowOS V0.3: standalone integration + opportunity layer
create type integration_kind as enum ('commerce','website','marketplace','messaging','custom');
create type integration_status as enum ('disconnected','pending','connected','degraded','disabled');
create type opportunity_status as enum ('new','reviewing','accepted','dismissed','converted');

create table external_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  kind integration_kind not null,
  status integration_status not null default 'disconnected',
  base_url text,
  external_account_ref text,
  capabilities jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_id uuid references external_integrations(id) on delete set null,
  source text not null,
  event_type text not null,
  external_id text,
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table commerce_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_id uuid references external_integrations(id) on delete set null,
  source text not null,
  signal_type text not null,
  product_ref text,
  search_query text,
  quantity numeric(14,2),
  value numeric(14,2),
  metadata jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table growth_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  summary text,
  source text not null,
  opportunity_type text not null,
  score numeric(5,2) not null default 0,
  status opportunity_status not null default 'new',
  product_ref text,
  recommended_action text,
  evidence jsonb not null default '{}'::jsonb,
  assigned_to uuid references profiles(id),
  created_task_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  contact_email text,
  contact_phone text,
  status text not null default 'pending',
  commission_rate numeric(5,2) not null default 0,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table external_product_offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete cascade,
  external_product_id text,
  title text not null,
  source_url text,
  source_price numeric(14,2),
  selling_price numeric(14,2),
  commission_amount numeric(14,2),
  availability text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into marketplaces (name, slug) values ('Facebook Marketplace','facebook-marketplace') on conflict (slug) do nothing;

create index if not exists idx_integrations_org on external_integrations(organization_id,status);
create index if not exists idx_integration_events_org_created on integration_events(organization_id,created_at desc);
create index if not exists idx_commerce_signals_org_observed on commerce_signals(organization_id,observed_at desc);
create index if not exists idx_growth_opportunities_org_status on growth_opportunities(organization_id,status,score desc);

-- WorkflowOS V0.4: secure bridge + connected commerce mirrors
create table if not exists integration_credentials (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references external_integrations(id) on delete cascade,
  public_key text not null unique,
  secret_hash text not null,
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists connected_staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_id uuid not null references external_integrations(id) on delete cascade,
  external_staff_id text not null,
  profile_id uuid references profiles(id) on delete set null,
  email text not null,
  full_name text not null,
  role user_role not null default 'staff',
  department text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_staff_id)
);

create table if not exists connected_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_id uuid not null references external_integrations(id) on delete cascade,
  external_product_id text not null,
  sku text,
  name text not null,
  category text,
  price numeric(14,2),
  cost_price numeric(14,2),
  stock_quantity numeric(14,2),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_product_id)
);

create table if not exists connected_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_id uuid not null references external_integrations(id) on delete cascade,
  external_order_id text not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  status text not null default 'new',
  total_amount numeric(14,2),
  currency text not null default 'NGN',
  channel text,
  items jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ordered_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_order_id)
);

create table if not exists customer_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_id uuid references external_integrations(id) on delete set null,
  channel text not null,
  external_conversation_id text,
  customer_name text,
  customer_phone text,
  customer_email text,
  lead_id uuid references leads(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  subject text,
  last_message text,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_integration_event_dedupe on integration_events(integration_id, external_id) where external_id is not null;
create index if not exists idx_connected_staff_org on connected_staff(organization_id,status);
create index if not exists idx_connected_products_org on connected_products(organization_id,active);
create index if not exists idx_connected_orders_org on connected_orders(organization_id,ordered_at desc);
create index if not exists idx_conversations_org_status on customer_conversations(organization_id,status,created_at desc);

-- WorkflowOS V0.5: decision engine, smart routing, shared identity and marketplace jobs
create type recommendation_status as enum ('new','accepted','dismissed','completed');
create type marketplace_job_status as enum ('queued','running','needs_review','completed','failed','cancelled');

create table if not exists shared_identity_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  integration_id uuid not null references external_integrations(id) on delete cascade,
  external_staff_id text not null,
  external_email text,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_staff_id),
  unique (profile_id, integration_id)
);

create table if not exists staff_capabilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  capability text not null,
  proficiency integer not null default 3 check (proficiency between 1 and 5),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, capability)
);

create table if not exists marketplace_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  marketplace_id uuid references marketplaces(id) on delete set null,
  connection_id uuid references marketplace_connections(id) on delete set null,
  job_type text not null,
  status marketplace_job_status not null default 'queued',
  product_ref text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  requested_by uuid references profiles(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  recommendation_type text not null,
  title text not null,
  rationale text,
  score numeric(5,2) not null default 0,
  status recommendation_status not null default 'new',
  source_opportunity_id uuid references growth_opportunities(id) on delete set null,
  recommended_assignee uuid references profiles(id) on delete set null,
  action_payload jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  created_task_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shared_identity_org on shared_identity_links(organization_id, integration_id);
create index if not exists idx_staff_capabilities_org_cap on staff_capabilities(organization_id, capability, proficiency desc);
create index if not exists idx_marketplace_jobs_org_status on marketplace_jobs(organization_id,status,created_at desc);
create index if not exists idx_growth_recommendations_org_score on growth_recommendations(organization_id,status,score desc);

-- WorkflowOS V0.6: live recommendation workflow, SLA automation and connector worker state
create table if not exists recommendation_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  recommendation_id uuid not null references growth_recommendations(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  action text not null check (action in ('accepted','dismissed','completed','task_created','reassigned')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sla_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  entity_type text not null,
  source text,
  trigger_status text,
  response_minutes integer not null default 60 check (response_minutes > 0),
  capability text not null default 'operations',
  priority priority_level not null default 'high',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists connector_worker_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  marketplace_job_id uuid references marketplace_jobs(id) on delete set null,
  connector_slug text not null,
  status text not null default 'started' check (status in ('started','completed','failed','needs_review')),
  attempt integer not null default 1,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_recommendation_actions_org on recommendation_actions(organization_id,created_at desc);
create index if not exists idx_sla_rules_org_active on sla_rules(organization_id,active);
create index if not exists idx_connector_worker_runs_org on connector_worker_runs(organization_id,started_at desc);

-- WorkflowOS V0.8: operational workflow indexes
create index if not exists idx_approvals_org_status_created on approvals(organization_id,status,created_at desc);
create index if not exists idx_campaigns_org_status_dates on campaigns(organization_id,status,starts_at,ends_at);
create index if not exists idx_conversations_assigned_status on customer_conversations(assigned_to,status,created_at desc);

-- WorkflowOS V0.9: conversation workspace, campaign playbooks and analytics events
create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references customer_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','note')),
  sender_profile_id uuid references profiles(id) on delete set null,
  external_message_id text,
  body text not null,
  status text not null default 'sent',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists campaign_playbooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  channel text,
  objective text,
  tasks jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  source text,
  entity_type text,
  entity_id text,
  amount numeric(14,2),
  currency text default 'NGN',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_messages_conversation on conversation_messages(conversation_id,created_at);
create unique index if not exists idx_conversation_messages_external on conversation_messages(conversation_id,external_message_id) where external_message_id is not null;
create index if not exists idx_campaign_playbooks_org on campaign_playbooks(organization_id,active);
create index if not exists idx_analytics_events_org_time on analytics_events(organization_id,occurred_at desc);
create index if not exists idx_analytics_events_org_type on analytics_events(organization_id,event_type,occurred_at desc);

-- WorkflowOS V1.0: organization settings and event-driven automations
create table if not exists organization_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  default_currency text not null default 'NGN',
  timezone text not null default 'Africa/Lagos',
  locale text not null default 'en-NG',
  notification_preferences jsonb not null default '{}'::jsonb,
  automation_preferences jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  trigger_event text not null,
  action_type text not null,
  conditions jsonb not null default '{}'::jsonb,
  action_config jsonb not null default '{}'::jsonb,
  capability text not null default 'operations',
  priority priority_level not null default 'medium',
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  automation_rule_id uuid references automation_rules(id) on delete set null,
  trigger_event text not null,
  source_entity_type text,
  source_entity_id text,
  status text not null default 'started' check (status in ('started','completed','failed','skipped','needs_review')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_automation_rules_org_event on automation_rules(organization_id,active,trigger_event);
create index if not exists idx_automation_runs_org_started on automation_runs(organization_id,started_at desc);

-- WorkflowOS V1.1: multi-site operating layer + vendor commerce
create table if not exists connected_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_id uuid references external_integrations(id) on delete set null,
  name text not null,
  slug text not null,
  site_type text not null default 'commerce',
  domain text,
  status text not null default 'active' check (status in ('active','paused','disconnected')),
  is_primary boolean not null default false,
  capabilities jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists vendor_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete restrict,
  connected_order_id uuid references connected_orders(id) on delete set null,
  external_product_offer_id uuid references external_product_offers(id) on delete set null,
  quantity numeric(14,2) not null default 1,
  gross_amount numeric(14,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  vendor_amount numeric(14,2) not null default 0,
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending','confirmed','fulfilled','cancelled','refunded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vendor_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete restrict,
  amount numeric(14,2) not null default 0,
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending','approved','paid','failed','cancelled')),
  reference text,
  period_start timestamptz,
  period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_connected_sites_org on connected_sites(organization_id,status);
create index if not exists idx_vendor_orders_org_vendor on vendor_orders(organization_id,vendor_id,created_at desc);
create index if not exists idx_vendor_settlements_org_vendor on vendor_settlements(organization_id,vendor_id,created_at desc);

-- WorkflowOS V1.3: AI proposal/approval layer
create table if not exists ai_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  proposal_type text not null check (proposal_type in ('task','campaign','marketplace_job','vendor_action','general')),
  title text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','rejected','executed','cancelled')),
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_proposals_org_status on ai_proposals(organization_id,status,created_at desc);

-- WorkflowOS V1.5: staff execution time and focus sessions
create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create index if not exists idx_time_entries_user_started on time_entries(organization_id,user_id,started_at desc);
create unique index if not exists idx_time_entries_one_running on time_entries(user_id) where ended_at is null;

-- WorkflowOS V1.6: recurring work + workload planning
create table if not exists recurring_work_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  department text,
  capability text not null default 'operations',
  assignee_id uuid references profiles(id) on delete set null,
  priority priority_level not null default 'medium',
  cadence text not null default 'weekly' check (cadence in ('daily','weekdays','weekly','monthly')),
  due_offset_hours integer not null default 24 check (due_offset_hours >= 0),
  active boolean not null default true,
  last_generated_at timestamptz,
  next_run_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recurring_work_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  template_id uuid not null references recurring_work_templates(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  status text not null default 'generated' check (status in ('generated','skipped','failed')),
  generated_for timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_recurring_templates_org_next on recurring_work_templates(organization_id,active,next_run_at);
create index if not exists idx_recurring_runs_org_created on recurring_work_runs(organization_id,created_at desc);

-- WorkflowOS V1.8: staff availability, operational calendar and SLA incidents
create table if not exists staff_availability (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'available' check (status in ('available','busy','away','offline','leave')),
  available_from timestamptz,
  available_until timestamptz,
  note text,
  updated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,user_id)
);

create table if not exists schedule_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  event_type text not null default 'work' check (event_type in ('work','campaign','followup','meeting','deadline','reminder')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  owner_id uuid references profiles(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists sla_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sla_rule_id uuid references sla_rules(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  source text,
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved','breached','cancelled')),
  assigned_to uuid references profiles(id) on delete set null,
  first_response_at timestamptz,
  resolved_at timestamptz,
  escalation_level integer not null default 0 check (escalation_level >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, entity_type, entity_id, sla_rule_id)
);

create index if not exists idx_staff_availability_org_status on staff_availability(organization_id,status);
create index if not exists idx_schedule_events_org_starts on schedule_events(organization_id,starts_at);
create index if not exists idx_sla_incidents_org_due on sla_incidents(organization_id,status,due_at);

-- Sales CRM: follow-up cadence, deals and quotes
create table if not exists lead_followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  assigned_to uuid references profiles(id) on delete set null,
  due_at timestamptz not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','phone','email','storefront','marketplace','other')),
  status text not null default 'pending' check (status in ('pending','completed','skipped','cancelled')),
  outcome text,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  title text not null,
  owner_id uuid references profiles(id) on delete set null,
  stage text not null default 'qualified' check (stage in ('qualified','proposal','negotiation','won','lost')),
  amount numeric(14,2) not null default 0,
  currency text not null default 'NGN',
  probability integer not null default 25 check (probability between 0 and 100),
  expected_close_at timestamptz,
  source text,
  product_interest text,
  loss_reason text,
  notes text,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists deal_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  deal_id uuid not null references deals(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  activity_type text not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  quote_number text not null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired','cancelled')),
  currency text not null default 'NGN',
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  valid_until timestamptz,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, quote_number)
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  description text not null,
  product_ref text,
  quantity numeric(14,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_followups_org_due on lead_followups(organization_id,status,due_at);
create index if not exists idx_deals_org_stage on deals(organization_id,stage,updated_at desc);
create index if not exists idx_deals_owner on deals(owner_id,stage);
create index if not exists idx_quotes_org_status on quotes(organization_id,status,created_at desc);

-- Customer 360: shared customer identity across sites, sales and messaging
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text,
  phone text,
  email text,
  lifecycle text not null default 'prospect' check (lifecycle in ('prospect','customer','repeat','vip','inactive')),
  primary_source text,
  total_orders integer not null default 0,
  total_spend numeric(14,2) not null default 0,
  last_order_at timestamptz,
  last_seen_at timestamptz,
  owner_id uuid references profiles(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_customers_org_email_unique on customers(organization_id, lower(email)) where email is not null;
create index if not exists idx_customers_org_phone on customers(organization_id,phone) where phone is not null;
create index if not exists idx_customers_org_spend on customers(organization_id,total_spend desc);

alter table leads add column if not exists customer_id uuid references customers(id) on delete set null;
alter table connected_orders add column if not exists customer_id uuid references customers(id) on delete set null;
alter table customer_conversations add column if not exists customer_id uuid references customers(id) on delete set null;
create index if not exists idx_connected_orders_customer on connected_orders(customer_id,ordered_at desc);
create index if not exists idx_leads_customer on leads(customer_id,created_at desc);
create index if not exists idx_conversations_customer on customer_conversations(customer_id,created_at desc);

-- Launch bootstrap: safely provision the first owner workspace on ordinary Supabase Auth signup.
create or replace function public.slugify_workspace_name(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input,'')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.handle_workflowos_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_name text;
  org_id uuid;
  base_slug text;
  final_slug text;
begin
  -- Staff invitations are provisioned by the server-side invite endpoint.
  if coalesce((new.raw_user_meta_data->>'workflowos_signup')::boolean, false) is not true then
    return new;
  end if;

  org_name := nullif(trim(new.raw_user_meta_data->>'organization_name'), '');
  if org_name is null then
    raise exception 'organization_name is required';
  end if;

  base_slug := public.slugify_workspace_name(org_name);
  if base_slug = '' then base_slug := 'workspace'; end if;
  final_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.organizations(name, slug)
  values (org_name, final_slug)
  returning id into org_id;

  insert into public.profiles(id, organization_id, full_name, email, role, active)
  values (
    new.id,
    org_id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(new.email,''), '@', 1), 'Owner'),
    new.email,
    'owner',
    true
  )
  on conflict (id) do nothing;

  insert into public.organization_settings(organization_id)
  values (org_id)
  on conflict (organization_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_workflowos on auth.users;
create trigger on_auth_user_created_workflowos
after insert on auth.users
for each row execute procedure public.handle_workflowos_signup();

-- Integration command queue: WorkflowOS requests external-system mutations without owning those records.
create table if not exists public.integration_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.external_integrations(id) on delete cascade,
  command_type text not null,
  target_entity_type text,
  target_entity_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending_approval' check (status in ('pending_approval','approved','dispatched','acknowledged','failed','cancelled')),
  requested_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  idempotency_key text,
  result jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  dispatched_at timestamptz,
  acknowledged_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_integration_commands_idempotency
  on public.integration_commands(integration_id,idempotency_key)
  where idempotency_key is not null;
create index if not exists idx_integration_commands_delivery
  on public.integration_commands(integration_id,status,created_at);
create index if not exists idx_integration_commands_org
  on public.integration_commands(organization_id,created_at desc);

-- Hardened external command delivery metadata.
alter table public.integration_commands add column if not exists attempt_count integer not null default 0;
alter table public.integration_commands add column if not exists last_error text;

-- Buyer intelligence: consented/public demand capture without taking ownership of commerce records.
create table if not exists buyer_intents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source text not null,
  external_ref text,
  buyer_name text,
  phone text,
  email text,
  product_query text not null,
  category text,
  brand text,
  model text,
  budget_min numeric(14,2),
  budget_max numeric(14,2),
  state text,
  city text,
  urgency text not null default 'normal' check (urgency in ('low','normal','high','immediate')),
  consent_status text not null default 'unknown' check (consent_status in ('unknown','public_signal','opted_in','do_not_contact')),
  intent_score numeric(5,2) not null default 0,
  status text not null default 'new' check (status in ('new','qualified','contacting','matched','converted','closed','ignored')),
  assigned_to uuid references profiles(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  matched_products jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source, external_ref)
);
create index if not exists idx_buyer_intents_org_status on buyer_intents(organization_id,status,intent_score desc);
create index if not exists idx_buyer_intents_location on buyer_intents(organization_id,state,city);
create index if not exists idx_buyer_intents_observed on buyer_intents(organization_id,observed_at desc);
