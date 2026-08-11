import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import OfferQuickCreate from '@/components/OfferQuickCreate';

export default async function Catalog() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const [{ data: vendors }, { data: offers }] = await Promise.all([
    supabase.from('vendors').select('id,name,commission_rate').eq('organization_id', org).eq('status', 'active'),
    supabase.from('external_product_offers').select('*,vendors(name)').eq('organization_id', org).order('created_at', { ascending: false }),
  ]);

  const totalMargin = (offers ?? []).reduce((sum: number, offer: any) => sum + Number(offer.commission_amount || 0), 0);

  return (
    <WorkspaceShell title="Catalog" subtitle="Connected commerce" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Commerce</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Catalog</h1>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-orange-700">Visible margin</div>
            <div className="text-xl font-black text-slate-950">₦{totalMargin.toLocaleString()}</div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500 md:grid-cols-[1.4fr_.7fr_.7fr_.7fr]">
              <span>Product</span><span>Source</span><span>Selling</span><span>Margin</span>
            </div>

            <div className="divide-y divide-slate-100">
              {(offers ?? []).map((offer: any, index: number) => {
                const gradients = [
                  'from-orange-400 to-rose-500',
                  'from-cyan-500 to-blue-500',
                  'from-violet-500 to-fuchsia-500',
                  'from-emerald-400 to-teal-500',
                ];
                return (
                  <div key={offer.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[1.4fr_.7fr_.7fr_.7fr] md:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]}`} />
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-950">{offer.title}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{offer.vendors?.name || 'Vendor'}</div>
                      </div>
                    </div>
                    <div className="font-bold text-slate-600">₦{Number(offer.source_price || 0).toLocaleString()}</div>
                    <div className="font-black text-slate-950">₦{Number(offer.selling_price || 0).toLocaleString()}</div>
                    <div className="font-black text-emerald-700">₦{Number(offer.commission_amount || 0).toLocaleString()}</div>
                  </div>
                );
              })}

              {!offers?.length && <div className="p-8 text-sm font-medium text-slate-500">No external offers yet.</div>}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <OfferQuickCreate vendors={(vendors ?? []) as any} />
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
