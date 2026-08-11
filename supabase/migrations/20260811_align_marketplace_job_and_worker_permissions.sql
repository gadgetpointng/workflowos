-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Marketplace jobs and connector worker runs are controlled by the same roles enforced
-- in app/api/marketplace-jobs and app/api/marketplace-workers/run: owner/admin/manager/marketing.
-- Ordinary staff retain same-org visibility but cannot queue or mutate jobs/runs directly.

drop policy if exists "org marketplace jobs" on public.marketplace_jobs;
drop policy if exists "marketplace jobs select same org" on public.marketplace_jobs;
drop policy if exists "marketplace jobs insert operators" on public.marketplace_jobs;
drop policy if exists "marketplace jobs update operators" on public.marketplace_jobs;

create policy "marketplace jobs select same org"
on public.marketplace_jobs
for select
to authenticated
using (organization_id = public.current_org_id());

create policy "marketplace jobs insert operators"
on public.marketplace_jobs
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager','marketing')
  and requested_by = auth.uid()
);

create policy "marketplace jobs update operators"
on public.marketplace_jobs
for update
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager','marketing')
)
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager','marketing')
);

-- connector_worker_runs needs authenticated writes for the explicit worker route.
drop policy if exists "connector_worker_runs select same org" on public.connector_worker_runs;
drop policy if exists "connector worker runs insert operators" on public.connector_worker_runs;
drop policy if exists "connector worker runs update operators" on public.connector_worker_runs;

create policy "connector_worker_runs select same org"
on public.connector_worker_runs
for select
to authenticated
using (organization_id = public.current_org_id());

create policy "connector worker runs insert operators"
on public.connector_worker_runs
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager','marketing')
  and exists (
    select 1 from public.marketplace_jobs j
    where j.id = connector_worker_runs.marketplace_job_id
      and j.organization_id = public.current_org_id()
  )
);

create policy "connector worker runs update operators"
on public.connector_worker_runs
for update
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager','marketing')
)
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager','marketing')
);

grant insert, update on table public.marketplace_jobs to authenticated;
grant insert, update on table public.connector_worker_runs to authenticated;
