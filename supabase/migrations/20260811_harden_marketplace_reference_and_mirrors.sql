-- Applied to the live WorkflowOS Supabase project on 2026-08-11.
-- Marketplace definitions are global reference data required for marketplace job joins.
-- Authenticated WorkflowOS users may read active marketplace definitions only.

drop policy if exists "marketplaces read active" on public.marketplaces;
create policy "marketplaces read active"
on public.marketplaces
for select
to authenticated
using (active = true);

grant select on table public.marketplaces to authenticated;
revoke all privileges on table public.marketplaces from anon;

-- Connection and listing rows are connector-owned state. Until official marketplace
-- credential management exists, browser clients may inspect same-org rows but cannot
-- create, edit or delete them directly.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['marketplace_connections','marketplace_listings']
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

revoke all privileges on table public.marketplace_connections from anon;
revoke all privileges on table public.marketplace_listings from anon;
revoke insert, update, delete, truncate, references, trigger on table public.marketplace_connections from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.marketplace_listings from authenticated;
grant select on table public.marketplace_connections to authenticated;
grant select on table public.marketplace_listings to authenticated;
