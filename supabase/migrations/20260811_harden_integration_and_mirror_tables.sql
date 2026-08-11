-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Browser clients may read connected systems, but commerce mirrors remain server-owned.

-- External integration definitions are readable by the workspace. New integrations may
-- be created only by management roles. Runtime bridge updates use the service-role client.
drop policy if exists "org external integrations" on public.external_integrations;
drop policy if exists "external integrations select same org" on public.external_integrations;
drop policy if exists "external integrations insert managers" on public.external_integrations;

create policy "external integrations select same org"
on public.external_integrations
for select
to authenticated
using (organization_id = public.current_org_id());

create policy "external integrations insert managers"
on public.external_integrations
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner', 'admin', 'manager')
);

-- Connected products and sites are read-only mirrors for WorkflowOS clients. All writes
-- are performed by authenticated bridge handlers or server-side catalog sync functions.
drop policy if exists "org connected products" on public.connected_products;
drop policy if exists "connected products select same org" on public.connected_products;
create policy "connected products select same org"
on public.connected_products
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists "org connected sites" on public.connected_sites;
drop policy if exists "connected sites select same org" on public.connected_sites;
create policy "connected sites select same org"
on public.connected_sites
for select
to authenticated
using (organization_id = public.current_org_id());
