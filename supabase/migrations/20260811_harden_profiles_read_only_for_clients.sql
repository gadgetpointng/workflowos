-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Profiles are provisioned by the auth signup trigger or trusted server-side admin flows.
-- Authenticated browser clients may read members of their own organization but may not
-- directly insert, update, or delete profile rows. This prevents self-promotion and
-- modification of the owner profile through the public Supabase API.

drop policy if exists "org profiles" on public.profiles;
drop policy if exists "profiles select same org" on public.profiles;

create policy "profiles select same org"
on public.profiles
for select
to authenticated
using (organization_id = public.current_org_id());
