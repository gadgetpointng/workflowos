import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import LeadQuickCreate from '@/components/LeadQuickCreate';
import LeadFollowupQuickCreate from '@/components/LeadFollowupQuickCreate';

const stages = ['new', 'contacted', 'interested', 'negotiating', 'purchased'] as const;

const stageStyles: Record<string, string> = {
  new: 'from-cyan-500 to-blue-500',
  contacted: 'from-violet-500 to-indigo-500',
  interested: 'from-fuchsia-500 to-pink-500',
  negotiating: 'from-orange-400 to-amber-500',
  purchased: 'from-emerald-400 to-teal-500',
};

export default async function Leads() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data: leads } = await supabase
    .from('leads')
    .select('*,assignee:profiles!leads_assigned_to_fkey(id,full_name)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(150);

  const pipeline = (leads ?? []).filter((lead: any) => lead.status !== 'lost');
  const value = pipeline.reduce(
    (sum: number, lead: any) => sum + Number(lead.estimated_value || 0),
    0
  );

  return (
    <WorkspaceShell title="Leads" subtitle="Sales pipeline" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">CRM</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Lead pipeline</h1>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-cyan-700">Active</div>
              <div className="text-xl font-black text-slate-950">{pipeline.length}</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Value</div>
              <div className="text-xl font-black text-slate-950">₦{value.toLocaleString()}</div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500" />
            <div>
              <div className="text-lg font-black text-slate-950">Capture lead</div>
              <div className="text-xs font-medium text-slate-500">Add a new opportunity</div>
            </div>
          </div>
          <LeadQuickCreate />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stages.map((stage) => {
            const list = (leads ?? []).filter((lead: any) => lead.status === stage);
            return (
              <div key={stage} className="rounded-[26px] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${stageStyles[stage]}`} />
                    <span className="text-sm font-black capitalize text-slate-900">{stage}</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{list.length}</span>
                </div>

                <div className="space-y-3">
                  {list.map((lead: any) => (
                    <article key={lead.id} className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900">{lead.name || lead.phone || lead.email || 'Unnamed lead'}</h3>
                        {lead.source && (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                            {lead.source}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">{lead.product_interest || 'General inquiry'}</p>

                      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                        <span>{lead.assignee?.full_name || 'Unassigned'}</span>
                        {lead.estimated_value && (
                          <strong className="text-emerald-700">₦{Number(lead.estimated_value).toLocaleString()}</strong>
                        )}
                      </div>

                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <LeadFollowupQuickCreate leadId={lead.id} assigneeId={lead.assigned_to} />
                      </div>
                    </article>
                  ))}

                  {!list.length && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm font-medium text-slate-400">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </WorkspaceShell>
  );
}
