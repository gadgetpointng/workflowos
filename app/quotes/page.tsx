import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import QuoteQuickCreate from '@/components/QuoteQuickCreate';
import QuoteStatusActions from '@/components/QuoteStatusActions';

export default async function Quotes() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const [quotes, leads, deals] = await Promise.all([
    supabase.from('quotes').select('*').eq('organization_id', org).order('created_at', { ascending: false }).limit(200),
    supabase.from('leads').select('id,name,phone,email').eq('organization_id', org).order('created_at', { ascending: false }).limit(200),
    supabase.from('deals').select('id,title').eq('organization_id', org).not('stage', 'in', '("won","lost")').order('created_at', { ascending: false }).limit(200),
  ]);

  const leadMap = new Map((leads.data ?? []).map((lead: any) => [lead.id, lead]));
  const open = (quotes.data ?? []).filter((quote: any) => ['draft', 'sent'].includes(quote.status));
  const openValue = open.reduce((sum: number, quote: any) => sum + Number(quote.total_amount || 0), 0);

  return (
    <WorkspaceShell title="Quotes" subtitle="Sales documents" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Sales documents</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Quotes</h1>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Open value</div>
            <div className="text-xl font-black text-slate-950">₦{openValue.toLocaleString()}</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500" />
            <div>
              <div className="text-lg font-black text-slate-950">Create quote</div>
              <div className="text-xs font-medium text-slate-500">Build a customer offer</div>
            </div>
          </div>
          <QuoteQuickCreate leads={leads.data ?? []} deals={deals.data ?? []} />
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-black text-slate-950">Recent quotes</h2>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">{quotes.data?.length ?? 0}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {(quotes.data ?? []).map((quote: any) => {
              const lead: any = leadMap.get(quote.lead_id);
              const statusClass = quote.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : quote.status === 'rejected' ? 'bg-rose-50 text-rose-700' : quote.status === 'sent' ? 'bg-cyan-50 text-cyan-700' : 'bg-violet-50 text-violet-700';
              return (
                <div key={quote.id} className="grid gap-4 px-5 py-4 text-sm sm:px-6 lg:grid-cols-[1.2fr_.6fr_.7fr_.9fr] lg:items-center">
                  <div>
                    <div className="font-black text-slate-950">{quote.quote_number}</div>
                    <div className="mt-1 text-xs text-slate-500">{lead?.name || lead?.phone || lead?.email || 'Unlinked customer'}</div>
                  </div>
                  <div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass}`}>{quote.status}</span></div>
                  <div className="font-black text-slate-800">{quote.currency || 'NGN'} {Number(quote.total_amount || 0).toLocaleString()}</div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-500">{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'No expiry'}</span>
                    <QuoteStatusActions id={quote.id} status={quote.status} />
                  </div>
                </div>
              );
            })}

            {!quotes.data?.length && <div className="p-8 text-sm font-medium text-slate-500">No quotes yet.</div>}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
