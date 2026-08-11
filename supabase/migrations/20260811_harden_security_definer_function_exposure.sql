-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Restrict exposed SECURITY DEFINER helpers while preserving the functions RLS policies need.

-- Pin the helper search path to prevent object-shadowing attacks.
alter function public.slugify_workspace_name(text)
  set search_path to public, pg_temp;

-- RLS helpers must remain callable by authenticated users because policies invoke them,
-- but they do not need anonymous/public RPC exposure.
revoke execute on function public.current_org_id() from public, anon;
revoke execute on function public.current_role() from public, anon;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_role() to authenticated;

-- Trigger/infrastructure helpers are not public RPC endpoints.
revoke execute on function public.handle_workflowos_signup() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
