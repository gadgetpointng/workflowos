-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Manual identity linking is an explicit owner/admin/manager workflow in
-- app/api/identity-links. Keep ordinary staff blocked while restoring only the exact
-- management mutations this route requires.

drop policy if exists "shared identity links insert managers" on public.shared_identity_links;
drop policy if exists "shared identity links update managers" on public.shared_identity_links;
drop policy if exists "connected staff update managers" on public.connected_staff;

create policy "shared identity links insert managers"
on public.shared_identity_links
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager')
  and exists (
    select 1 from public.profiles p
    where p.id = shared_identity_links.profile_id
      and p.organization_id = public.current_org_id()
  )
  and exists (
    select 1 from public.external_integrations i
    where i.id = shared_identity_links.integration_id
      and i.organization_id = public.current_org_id()
  )
);

create policy "shared identity links update managers"
on public.shared_identity_links
for update
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager')
)
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager')
  and exists (
    select 1 from public.profiles p
    where p.id = shared_identity_links.profile_id
      and p.organization_id = public.current_org_id()
  )
  and exists (
    select 1 from public.external_integrations i
    where i.id = shared_identity_links.integration_id
      and i.organization_id = public.current_org_id()
  )
);

create policy "connected staff update managers"
on public.connected_staff
for update
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager')
)
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager')
);

grant insert, update on table public.shared_identity_links to authenticated;
grant update (profile_id, updated_at) on table public.connected_staff to authenticated;
