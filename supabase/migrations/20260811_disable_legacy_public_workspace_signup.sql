-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Public WorkflowOS workspace creation is disabled. Staff identities are provisioned
-- through trusted GadgetPoint SSO/admin flows. Block the legacy workflowos_signup
-- metadata path at the database trigger so direct Supabase Auth calls cannot create
-- a new owner workspace behind the disabled /signup UI.

create or replace function public.handle_workflowos_signup()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $$
begin
  if coalesce((new.raw_user_meta_data->>'workflowos_signup')::boolean, false) is true then
    raise exception 'Public WorkflowOS workspace creation is disabled';
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_workflowos_signup() from public, anon, authenticated;
