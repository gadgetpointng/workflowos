import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import VendorQuickCreate from '@/components/VendorQuickCreate';

export default async function Vendors() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const [{ data: vendors }, { data: orders }] = await Promise.all([
    supabase.from('vendors').select('*').eq('organization_id', org).order('created_at', { ascending: false }),
    supabase.from('vendor_orders').select('vendor_id,gross_amount,commission_amount,vendor_amount,status').eq('organization_id', org),
  ]);

  return (
    <WorkspaceShell title="Vendors" subtitle="Partner commerce" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">Commerce</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Vendor network</h1>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-teal-700">Vendors</div>
            <div className="text-xl font-black text-slate-950">{vendors?.length ?? 0}</div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="grid gap-4 md:grid-cols-2">
            {(vendors ?? []).map((vendor: any, index: number) => {
              const vendorOrders = (orders ?? []).filter((order: any) => order.vendor_id === vendor.id);
              const gross = vendorOrders.reduce((sum: number, order: any) => sum + Number(order.gross_amount || 0), 0);
              const commission = vendorOrders.reduce((sum: number, order: any) => sum + Number(order.commission_amount || 0), 0);
              const gradients = [
                'from-teal-400 to-emerald-500',
                'from-cyan-500 to-blue-500',
                'from-violet-500 to-fuchsia-500',
                'from-orange-400 to-rose-500',
              ];

              return (
                <article key={vendor.id} className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className={`h-1.5 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-950">{vendor.name}</div>
                        <div className="mt-1 truncate text-sm text-slate-500">{vendor.source_url || vendor.contact_email || 'Direct vendor'}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {Number(vendor.commission_rate || 0)}%
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-cyan-50/70 p-3">
                        <div className="text-[10px] font-black uppercase tracking-wide text-cyan-700">Gross sales</div>
                        <div className="mt-1 font-black text-slate-950">₦{gross.toLocaleString()}</div>
                      </div>
                      <div className="rounded-2xl bg-emerald-50/70 p-3">
                        <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Commission</div>
                        <div className="mt-1 font-black text-slate-950">₦{commission.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {!vendors?.length && (
              <div className="rounded-[28px] border border-dashed border-teal-200 bg-teal-50/60 p-8 text-sm font-medium text-slate-500">
                No vendors yet.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <VendorQuickCreate />
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
