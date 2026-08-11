import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import LeadFollowupQuickCreate from '@/components/LeadFollowupQuickCreate';
import { requireUser } from '@/lib/auth';

const statusTone: Record<string, string> = {
  new: 'bg-cyan-50 text-cyan-700',
  contacted: 'bg-violet-50 text-violet-700',
  interested: 'bg-fuchsia-50 text-fuchsia-700',
  negotiating: 'bg-orange-50 text-orange-700',
};

function naira(value: unknown) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

function ageDays(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export default async function RevenueRescuePage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data } = await supabase
    .from('leads')
    .select('id,name,phone,email,status,estimated_value,product_interest,source,assigned_to,created_at,assignee:profiles!leads_assigned_to_fkey(full_name)')
    .eq('organization_id', profile.organization_id)
    .in('status', ['new', 'contacted', 'interested', 'negotiating'])
    .order('estimated_value', { ascending: false })
    .limit(80);

  const leads = data ?? [];
  const pipelineValue = leads.reduce((sum: number, lead: any) => sum + Number(lead.estimated_value || 0), 0);
  const stale = leads.filter((lead: any) => ageDays(lead.created_at) >= 3);
  const unassigned = leads.filter((lead: any) => !lead.assigned_to);
  const closeNow = leads.filter((lead: any) => lead.status === 'negotiating');

  return (
    <WorkspaceShell title="Revenue Rescue" subtitle="Recover sales before they go cold" profile={profile}>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-emerald-200 bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950 p-6 text-white shadow-xl sm:p-8">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Revenue rescue</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Turn forgotten conversations into sales</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              High-value open leads are ranked here so the team can follow up before interest goes cold.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Open pipeline</div>
            <div className="mt-2 text-3xl font-black text-slate-950">{naira(pipelineValue)}</div>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-orange-700">Close now</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{closeNow.length}</div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-rose-700">Stale 3+ days</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{stale.length}</div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Unassigned</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{unassigned.length}</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.17em] text-emerald-600">Priority queue</div>
              <h2 className="mt-1 text-lg font-black text-slate-950">Open revenue opportunities</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{leads.length}</span>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {leads.map((lead: any) => {
              const days = ageDays(lead.created_at);
              const staleLead = days >= 3;
              return (
                <article key={lead.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-black text-slate-950">{lead.name || lead.phone || lead.email || 'Unnamed lead'}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                          {lead.status}
                        </span>
                        {staleLead && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase text-rose-700">{days}d old</span>}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">{lead.product_interest || 'General inquiry'}</p>
                    </div>
                    <strong className="shrink-0 text-base font-black text-emerald-700">{naira(lead.estimated_value)}</strong>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="font-black uppercase tracking-wide text-slate-400">Owner</div>
                      <div className="mt-1 truncate font-bold text-slate-800">{lead.assignee?.full_name || 'Unassigned'}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="font-black uppercase tracking-wide text-slate-400">Source</div>
                      <div className="mt-1 truncate font-bold text-slate-800">{lead.source || 'Unknown'}</div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <LeadFollowupQuickCreate leadId={lead.id} assigneeId={lead.assigned_to} />
                  </div>
                </article>
              );
            })}

            {!leads.length && (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-sm font-semibold text-slate-500">
                No open leads need rescuing.
              </div>
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
