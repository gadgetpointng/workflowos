-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Staff capability assignment is a management action. Keep same-org reads available,
-- but only owner/admin/manager may create or update capabilities, and the target profile
-- must belong to the same organization.

drop policy if exists "org staff capabilities" on public.staff_capabilities;
drop policy if exists "staff capabilities select same org" on public.staff_capabilities;
drop policy if exists "staff capabilities insert managers" on public.staff_capabilities;
drop policy if exists "staff capabilities update managers" on public.staff_capabilities;

create policy "staff capabilities select same org"
on public.staff_capabilities
for select
to authenticated
using (organization_id = public.current_org_id());

create policy "staff capabilities insert managers"
on public.staff_capabilities
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager')
  and exists (
    select 1 from public.profiles p
    where p.id = staff_capabilities.profile_id
      and p.organization_id = public.current_org_id()
  )
);

create policy "staff capabilities update managers"
on public.staff_capabilities
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
    where p.id = staff_capabilities.profile_id
      and p.organization_id = public.current_org_id()
  )
);
