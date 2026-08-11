-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Bridge identity, integration event and commerce mirror records are server-owned.
-- Authenticated WorkflowOS clients may read same-organization rows but cannot mutate them
-- directly through the public Supabase API. Trusted bridge/auth flows use the service role.

do $$
declare
  tbl text;
begin
  foreach tbl in array array['connected_staff','shared_identity_links','integration_events','commerce_signals','connected_orders']
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

-- Defense in depth: browser roles do not need mutation privileges on server-owned bridge records.
revoke all privileges on table public.connected_staff from anon;
revoke all privileges on table public.shared_identity_links from anon;
revoke all privileges on table public.integration_events from anon;
revoke all privileges on table public.commerce_signals from anon;
revoke all privileges on table public.connected_orders from anon;

revoke insert, update, delete, truncate, references, trigger on table public.connected_staff from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.shared_identity_links from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.integration_events from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.commerce_signals from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.connected_orders from authenticated;

grant select on table public.connected_staff to authenticated;
grant select on table public.shared_identity_links to authenticated;
grant select on table public.integration_events to authenticated;
grant select on table public.commerce_signals to authenticated;
grant select on table public.connected_orders to authenticated;
