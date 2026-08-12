-- WorkflowOS production security hardening.
-- Run after supabase/schema.sql and supabase/rls.sql.
-- Safe to re-run. Keeps identity helper functions out of the exposed API schema,
-- denies inactive profiles at the RLS layer, and tightens owner/security policies.

create schema if not exists private;

-- Preserve policy dependencies by moving the existing function objects when present.
do $$
begin
  if to_regprocedure('public.current_org_id()') is not null then
    execute 'alter function public.current_org_id() set schema private';
  end if;
  if to_regprocedure('public.current_role()') is not null then
    execute 'alter function public.current_role() set schema private';
  end if;
end
$$;

create or replace function private.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
    and active = true
$$;

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from public.profiles
  where id = auth.uid()
    and active = true
$$;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
revoke all on function private.current_org_id() from public, anon;
revoke all on function private.current_role() from public, anon;
grant execute on function private.current_org_id() to authenticated, service_role;
grant execute on function private.current_role() to authenticated, service_role;

-- Organization settings are readable by the organization but writable only by the owner.
drop policy if exists "org organization settings" on public.organization_settings;
drop policy if exists "organization settings select" on public.organization_settings;
drop policy if exists "organization settings insert owner" on public.organization_settings;
drop policy if exists "organization settings update owner" on public.organization_settings;
drop policy if exists "organization settings delete owner" on public.organization_settings;

create policy "organization settings select" on public.organization_settings
for select to authenticated
using (organization_id = private.current_org_id());

create policy "organization settings insert owner" on public.organization_settings
for insert to authenticated
with check (organization_id = private.current_org_id() and private.current_role() = 'owner');

create policy "organization settings update owner" on public.organization_settings
for update to authenticated
using (organization_id = private.current_org_id() and private.current_role() = 'owner')
with check (organization_id = private.current_org_id() and private.current_role() = 'owner');

create policy "organization settings delete owner" on public.organization_settings
for delete to authenticated
using (organization_id = private.current_org_id() and private.current_role() = 'owner');

-- Credential rows are never client-readable. Creation is restricted to authenticated managers
-- in the same organization and must be attributed to the current user.
drop policy if exists "insert integration credentials" on public.integration_credentials;
drop policy if exists "insert integration credentials managers" on public.integration_credentials;
create policy "insert integration credentials managers" on public.integration_credentials
for insert to authenticated
with check (
  private.current_role() in ('owner','admin','manager')
  and exists (
    select 1
    from public.external_integrations i
    where i.id = integration_credentials.integration_id
      and i.organization_id = private.current_org_id()
  )
  and created_by = (select auth.uid())
);

-- Avoid re-evaluating auth.uid() for every row on the policies that use it directly.
drop policy if exists "conversation messages org access" on public.conversation_messages;
create policy "conversation messages org access" on public.conversation_messages for all
using (organization_id in (select organization_id from public.profiles where id = (select auth.uid())))
with check (organization_id in (select organization_id from public.profiles where id = (select auth.uid())));

drop policy if exists "campaign playbooks org access" on public.campaign_playbooks;
create policy "campaign playbooks org access" on public.campaign_playbooks for all
using (organization_id is null or organization_id in (select organization_id from public.profiles where id = (select auth.uid())))
with check (organization_id is null or organization_id in (select organization_id from public.profiles where id = (select auth.uid())));

drop policy if exists "analytics events org access" on public.analytics_events;
create policy "analytics events org access" on public.analytics_events for select
using (organization_id in (select organization_id from public.profiles where id = (select auth.uid())));

drop policy if exists "time_entries_self_insert" on public.time_entries;
create policy "time_entries_self_insert" on public.time_entries for insert
with check (organization_id = private.current_org_id() and user_id = (select auth.uid()));

drop policy if exists "time_entries_self_update" on public.time_entries;
create policy "time_entries_self_update" on public.time_entries for update
using (organization_id = private.current_org_id() and user_id = (select auth.uid()))
with check (organization_id = private.current_org_id() and user_id = (select auth.uid()));

-- Consolidate notification inserts while preserving the existing permissions:
-- owner can send any same-org notification; authenticated task flows may emit task_submitted.
drop policy if exists "notifications insert owner" on public.notifications;
drop policy if exists "notifications insert task submitted compatibility" on public.notifications;
drop policy if exists "notifications insert authorized" on public.notifications;
create policy "notifications insert authorized" on public.notifications
for insert to authenticated
with check (
  organization_id = private.current_org_id()
  and exists (
    select 1 from public.profiles p
    where p.id = notifications.recipient_id
      and p.organization_id = private.current_org_id()
      and p.active = true
  )
  and (private.current_role() = 'owner' or type = 'task_submitted')
);

drop policy if exists "notifications select recipient or owner" on public.notifications;
create policy "notifications select recipient or owner" on public.notifications
for select to authenticated
using (
  organization_id = private.current_org_id()
  and (recipient_id = (select auth.uid()) or private.current_role() = 'owner')
);

drop policy if exists "notifications update recipient" on public.notifications;
create policy "notifications update recipient" on public.notifications
for update to authenticated
using (organization_id = private.current_org_id() and recipient_id = (select auth.uid()))
with check (organization_id = private.current_org_id() and recipient_id = (select auth.uid()));

drop policy if exists "automation rules insert managers" on public.automation_rules;
create policy "automation rules insert managers" on public.automation_rules
for insert to authenticated
with check (
  organization_id = private.current_org_id()
  and private.current_role() in ('owner','admin','manager')
  and created_by = (select auth.uid())
);

drop policy if exists "marketplace jobs insert operators" on public.marketplace_jobs;
create policy "marketplace jobs insert operators" on public.marketplace_jobs
for insert to authenticated
with check (
  organization_id = private.current_org_id()
  and private.current_role() in ('owner','admin','manager','marketing')
  and requested_by = (select auth.uid())
);
