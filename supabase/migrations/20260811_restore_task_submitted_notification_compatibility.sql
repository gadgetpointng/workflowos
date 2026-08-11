-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Temporary compatibility for the currently deployed task route. Once the updated task
-- route that uses createAdminClient() for system notifications is live, this policy can
-- be removed and owner-only browser notification creation retained.

drop policy if exists "notifications insert task submitted compatibility" on public.notifications;
create policy "notifications insert task submitted compatibility"
on public.notifications
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and type = 'task_submitted'
  and exists (
    select 1 from public.profiles p
    where p.id = notifications.recipient_id
      and p.organization_id = public.current_org_id()
      and p.active = true
  )
);
