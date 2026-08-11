-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Automation and connector execution history is produced by trusted server workers.
-- Browser clients may inspect same-organization history but cannot create, edit or delete it.

do $$
declare
  tbl text;
begin
  foreach tbl in array array['automation_runs','connector_worker_runs']
  loop
    execute format('drop policy if exists %I on public.%I', 'org ' || replace(tbl, '_', ' '), tbl);
    execute format('drop policy if exists %I on public.%I', tbl || ' select same org', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (organization_id = public.current_org_id())',
      tbl || ' select same org',
      tbl
    );
  end loop;
end $$;

revoke all privileges on table public.automation_runs from anon;
revoke all privileges on table public.connector_worker_runs from anon;
revoke insert, update, delete, truncate, references, trigger on table public.automation_runs from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.connector_worker_runs from authenticated;
grant select on table public.automation_runs to authenticated;
grant select on table public.connector_worker_runs to authenticated;
