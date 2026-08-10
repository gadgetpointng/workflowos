-- Production RLS template.
-- Run after the organization/auth provisioning flow is established.
-- The helper function assumes profiles.id = auth.uid().

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_checklists enable row level security;
alter table public.task_comments enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_tasks enable row level security;
alter table public.marketing_content enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.goals enable row level security;
alter table public.marketplace_connections enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

create policy "org profiles" on public.profiles for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "org tasks" on public.tasks for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "org campaigns" on public.campaigns for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "org content" on public.marketing_content for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "org leads" on public.leads for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "org goals" on public.goals for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "org marketplace connections" on public.marketplace_connections for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "org marketplace listings" on public.marketplace_listings for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "org knowledge" on public.knowledge_documents for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "org notifications" on public.notifications for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

create policy "org activity logs" on public.activity_logs for all
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

-- V1.2 dependent-table and role-aware policies
alter table public.approvals enable row level security;
create policy "org approvals" on public.approvals for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org task checklists" on public.task_checklists for all using (exists(select 1 from public.tasks t where t.id=task_id and t.organization_id=public.current_org_id())) with check (exists(select 1 from public.tasks t where t.id=task_id and t.organization_id=public.current_org_id()));
create policy "org task comments" on public.task_comments for all using (exists(select 1 from public.tasks t where t.id=task_id and t.organization_id=public.current_org_id())) with check (exists(select 1 from public.tasks t where t.id=task_id and t.organization_id=public.current_org_id()));
create policy "org campaign tasks" on public.campaign_tasks for all using (exists(select 1 from public.campaigns c where c.id=campaign_id and c.organization_id=public.current_org_id())) with check (exists(select 1 from public.campaigns c where c.id=campaign_id and c.organization_id=public.current_org_id()));
create policy "org lead activities" on public.lead_activities for all using (exists(select 1 from public.leads l where l.id=lead_id and l.organization_id=public.current_org_id())) with check (exists(select 1 from public.leads l where l.id=lead_id and l.organization_id=public.current_org_id()));

-- WorkflowOS V0.3 integration layer
alter table public.external_integrations enable row level security;
alter table public.integration_events enable row level security;
alter table public.commerce_signals enable row level security;
alter table public.growth_opportunities enable row level security;
alter table public.vendors enable row level security;
alter table public.external_product_offers enable row level security;

create policy "org external integrations" on public.external_integrations for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org integration events" on public.integration_events for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org commerce signals" on public.commerce_signals for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org growth opportunities" on public.growth_opportunities for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org vendors" on public.vendors for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org external product offers" on public.external_product_offers for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());

-- WorkflowOS V0.4 bridge mirrors. Credentials are intentionally not readable through ordinary client RLS.
alter table public.integration_credentials enable row level security;
alter table public.connected_staff enable row level security;
alter table public.connected_products enable row level security;
alter table public.connected_orders enable row level security;
alter table public.customer_conversations enable row level security;

create policy "org connected staff" on public.connected_staff for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org connected products" on public.connected_products for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org connected orders" on public.connected_orders for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org customer conversations" on public.customer_conversations for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());

-- Credential creation is done server-side by an authenticated manager. No SELECT policy is provided.
create policy "insert integration credentials" on public.integration_credentials for insert
with check (exists (
  select 1 from public.external_integrations i
  where i.id=integration_id and i.organization_id=public.current_org_id()
));

-- WorkflowOS V0.5
alter table public.shared_identity_links enable row level security;
alter table public.staff_capabilities enable row level security;
alter table public.marketplace_jobs enable row level security;
alter table public.growth_recommendations enable row level security;
create policy "org shared identity links" on public.shared_identity_links for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org staff capabilities" on public.staff_capabilities for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org marketplace jobs" on public.marketplace_jobs for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org growth recommendations" on public.growth_recommendations for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());

-- WorkflowOS V0.6
alter table public.recommendation_actions enable row level security;
alter table public.sla_rules enable row level security;
alter table public.connector_worker_runs enable row level security;
create policy "org recommendation actions" on public.recommendation_actions for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org sla rules" on public.sla_rules for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org connector worker runs" on public.connector_worker_runs for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());

-- WorkflowOS V0.9 policies
alter table conversation_messages enable row level security;
alter table campaign_playbooks enable row level security;
alter table analytics_events enable row level security;

drop policy if exists "conversation messages org access" on conversation_messages;
create policy "conversation messages org access" on conversation_messages for all using (
  organization_id in (select organization_id from profiles where id = auth.uid())
) with check (
  organization_id in (select organization_id from profiles where id = auth.uid())
);

drop policy if exists "campaign playbooks org access" on campaign_playbooks;
create policy "campaign playbooks org access" on campaign_playbooks for all using (
  organization_id is null or organization_id in (select organization_id from profiles where id = auth.uid())
) with check (
  organization_id is null or organization_id in (select organization_id from profiles where id = auth.uid())
);

drop policy if exists "analytics events org access" on analytics_events;
create policy "analytics events org access" on analytics_events for select using (
  organization_id in (select organization_id from profiles where id = auth.uid())
);

-- WorkflowOS V1.0 policies
alter table public.organization_settings enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;
create policy "org organization settings" on public.organization_settings for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org automation rules" on public.automation_rules for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org automation runs" on public.automation_runs for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());

-- WorkflowOS V1.1 policies
alter table public.connected_sites enable row level security;
alter table public.vendor_orders enable row level security;
alter table public.vendor_settlements enable row level security;
create policy "org connected sites" on public.connected_sites for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org vendor orders" on public.vendor_orders for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org vendor settlements" on public.vendor_settlements for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());

alter table ai_proposals enable row level security;
create policy "org members read ai proposals" on ai_proposals for select using (organization_id = public.current_org_id());
create policy "org members create ai proposals" on ai_proposals for insert with check (organization_id = public.current_org_id());
create policy "managers update ai proposals" on ai_proposals for update using (organization_id = public.current_org_id() and public.current_role() in ('owner','admin','manager')) with check (organization_id = public.current_org_id());

alter table time_entries enable row level security;
drop policy if exists "time_entries_org_select" on time_entries;
create policy "time_entries_org_select" on time_entries for select using (organization_id = public.current_org_id());
drop policy if exists "time_entries_self_insert" on time_entries;
create policy "time_entries_self_insert" on time_entries for insert with check (organization_id = public.current_org_id() and user_id = auth.uid());
drop policy if exists "time_entries_self_update" on time_entries;
create policy "time_entries_self_update" on time_entries for update using (organization_id = public.current_org_id() and user_id = auth.uid()) with check (organization_id = public.current_org_id() and user_id = auth.uid());

-- WorkflowOS V1.6 policies
alter table public.recurring_work_templates enable row level security;
alter table public.recurring_work_runs enable row level security;
create policy "org recurring work templates" on public.recurring_work_templates for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org recurring work runs" on public.recurring_work_runs for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());

-- WorkflowOS V1.8 policies
alter table public.staff_availability enable row level security;
alter table public.schedule_events enable row level security;
alter table public.sla_incidents enable row level security;
create policy "org staff availability" on public.staff_availability for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org schedule events" on public.schedule_events for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org sla incidents" on public.sla_incidents for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());

-- Sales CRM policies
alter table public.lead_followups enable row level security;
alter table public.deals enable row level security;
alter table public.deal_activities enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
create policy "org lead followups" on public.lead_followups for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org deals" on public.deals for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org deal activities" on public.deal_activities for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org quotes" on public.quotes for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());
create policy "org quote items" on public.quote_items for all using (exists(select 1 from public.quotes q where q.id=quote_id and q.organization_id=public.current_org_id())) with check (exists(select 1 from public.quotes q where q.id=quote_id and q.organization_id=public.current_org_id()));

-- Customer 360 policies
alter table public.customers enable row level security;
create policy "org customers" on public.customers for all using (organization_id=public.current_org_id()) with check (organization_id=public.current_org_id());

-- Launch hardening: organizations are no longer globally readable.
alter table public.organizations enable row level security;
drop policy if exists "org organization read" on public.organizations;
create policy "org organization read" on public.organizations for select
using (id = public.current_org_id());

-- Boundary-safe integration command queue.
alter table public.integration_commands enable row level security;
drop policy if exists "org integration commands read" on public.integration_commands;
create policy "org integration commands read" on public.integration_commands for select
using (organization_id = public.current_org_id());
drop policy if exists "org integration commands insert" on public.integration_commands;
create policy "org integration commands insert" on public.integration_commands for insert
with check (organization_id = public.current_org_id());
drop policy if exists "managers update integration commands" on public.integration_commands;
create policy "managers update integration commands" on public.integration_commands for update
using (organization_id = public.current_org_id() and public.current_role() in ('owner','admin','manager'))
with check (organization_id = public.current_org_id() and public.current_role() in ('owner','admin','manager'));

-- Buyer intelligence policies
alter table public.buyer_intents enable row level security;
drop policy if exists "org buyer intents" on public.buyer_intents;
create policy "org buyer intents" on public.buyer_intents for all
using (organization_id=public.current_org_id())
with check (organization_id=public.current_org_id());
