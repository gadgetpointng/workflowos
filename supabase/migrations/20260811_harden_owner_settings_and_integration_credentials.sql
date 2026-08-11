-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Keep database authorization aligned with application-level management rules.

-- Organization settings are readable by members of the same organization,
-- but organization-wide settings (including owner_controls) are writable only by owners.
drop policy if exists "org organization settings" on public.organization_settings;

drop policy if exists "organization settings select" on public.organization_settings;
create policy "organization settings select"
on public.organization_settings
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists "organization settings insert owner" on public.organization_settings;
create policy "organization settings insert owner"
on public.organization_settings
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_role() = 'owner'
);

drop policy if exists "organization settings update owner" on public.organization_settings;
create policy "organization settings update owner"
on public.organization_settings
for update
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_role() = 'owner'
)
with check (
  organization_id = public.current_org_id()
  and public.current_role() = 'owner'
);

drop policy if exists "organization settings delete owner" on public.organization_settings;
create policy "organization settings delete owner"
on public.organization_settings
for delete
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_role() = 'owner'
);

-- Credential minting matches lib/auth.ts canManage(): owner, admin, manager.
-- Ordinary staff can no longer mint an integration identity directly through Supabase.
drop policy if exists "insert integration credentials" on public.integration_credentials;
drop policy if exists "insert integration credentials managers" on public.integration_credentials;
create policy "insert integration credentials managers"
on public.integration_credentials
for insert
to authenticated
with check (
  public.current_role() in ('owner', 'admin', 'manager')
  and exists (
    select 1
    from public.external_integrations i
    where i.id = integration_credentials.integration_id
      and i.organization_id = public.current_org_id()
  )
  and created_by = auth.uid()
);
