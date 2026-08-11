-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Notifications can contain private owner-to-staff messages. Staff may read only their
-- own notifications. The owner may read workspace notifications for delivery/read-receipt
-- tracking, create owner messages and retract them. Staff may only update read_at on their
-- own rows. System-generated notifications continue through the service role.

drop policy if exists "org notifications" on public.notifications;
drop policy if exists "notifications select recipient or owner" on public.notifications;
drop policy if exists "notifications insert owner" on public.notifications;
drop policy if exists "notifications update recipient" on public.notifications;
drop policy if exists "notifications delete owner" on public.notifications;

create policy "notifications select recipient or owner"
on public.notifications
for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (recipient_id = auth.uid() or public.current_role() = 'owner')
);

create policy "notifications insert owner"
on public.notifications
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_role() = 'owner'
  and exists (
    select 1 from public.profiles p
    where p.id = notifications.recipient_id
      and p.organization_id = public.current_org_id()
      and p.active = true
  )
);

create policy "notifications update recipient"
on public.notifications
for update
to authenticated
using (
  organization_id = public.current_org_id()
  and recipient_id = auth.uid()
)
with check (
  organization_id = public.current_org_id()
  and recipient_id = auth.uid()
);

create policy "notifications delete owner"
on public.notifications
for delete
to authenticated
using (
  organization_id = public.current_org_id()
  and public.current_role() = 'owner'
);

revoke all privileges on table public.notifications from anon;
revoke update on table public.notifications from authenticated;
grant select, insert, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
