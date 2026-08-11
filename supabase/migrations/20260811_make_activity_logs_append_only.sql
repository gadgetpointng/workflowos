-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Activity logs are audit history. Authenticated clients may read same-organization
-- entries and append new entries used by existing APIs, but cannot rewrite or delete history.

drop policy if exists "org activity logs" on public.activity_logs;
drop policy if exists "activity logs select same org" on public.activity_logs;
drop policy if exists "activity logs insert same org" on public.activity_logs;

create policy "activity logs select same org"
on public.activity_logs
for select
to authenticated
using (organization_id = public.current_org_id());

create policy "activity logs insert same org"
on public.activity_logs
for insert
to authenticated
with check (organization_id = public.current_org_id());

revoke all privileges on table public.activity_logs from anon;
revoke update, delete, truncate, references, trigger on table public.activity_logs from authenticated;
grant select, insert on table public.activity_logs to authenticated;
