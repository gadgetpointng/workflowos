-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Automation rules can trigger operational actions. Same-org members may read rules,
-- but only management roles may create or update them, matching app/api/automations.

drop policy if exists "org automation rules" on public.automation_rules;
drop policy if exists "automation rules select same org" on public.automation_rules;
drop policy if exists "automation rules insert managers" on public.automation_rules;
drop policy if exists "automation rules update managers" on public.automation_rules;

create policy "automation rules select same org"
on public.automation_rules
for select
to authenticated
using (organization_id = public.current_org_id());

create policy "automation rules insert managers"
on public.automation_rules
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager')
  and created_by = auth.uid()
);

create policy "automation rules update managers"
on public.automation_rules
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
