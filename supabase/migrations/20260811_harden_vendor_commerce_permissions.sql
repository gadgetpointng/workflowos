-- Apply with the vendor management authorization update in app/api/vendors and app/vendors.
-- Vendor creation is restricted to owner/admin/manager. Vendor commerce outcome tables are
-- server-owned; WorkflowOS clients may inspect them but cannot forge orders, settlements or offers.

drop policy if exists "org vendors" on public.vendors;
drop policy if exists "vendors select same org" on public.vendors;
drop policy if exists "vendors insert managers" on public.vendors;

create policy "vendors select same org"
on public.vendors
for select
to authenticated
using (organization_id = public.current_org_id());

create policy "vendors insert managers"
on public.vendors
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.current_role() in ('owner','admin','manager')
);

revoke all privileges on table public.vendors from anon;
revoke update, delete, truncate, references, trigger on table public.vendors from authenticated;
grant select, insert on table public.vendors to authenticated;

-- Commerce results are created by trusted bridge/connector/admin flows.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['vendor_orders','vendor_settlements','external_product_offers']
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

revoke all privileges on table public.vendor_orders from anon;
revoke all privileges on table public.vendor_settlements from anon;
revoke all privileges on table public.external_product_offers from anon;
revoke insert, update, delete, truncate, references, trigger on table public.vendor_orders from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.vendor_settlements from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.external_product_offers from authenticated;
grant select on table public.vendor_orders to authenticated;
grant select on table public.vendor_settlements to authenticated;
grant select on table public.external_product_offers to authenticated;
