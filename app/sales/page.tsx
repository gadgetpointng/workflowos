import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import DealQuickCreate from '@/components/DealQuickCreate';
import DealStageActions from '@/components/DealStageActions';
import FollowupCompleteButton from '@/components/FollowupCompleteButton';

const stages = ['qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

const stageStyles: Record<string, string> = {
  qualified: 'from-cyan-500 to-blue-500',
  proposal: 'from-violet-500 to-indigo-500',
  negotiation: 'from-orange-400 to-amber-500',
  won: 'from-emerald-400 to-teal-500',
  lost: 'from-slate-500 to-slate-700',
};

export default async function Sales() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const now = new Date().toISOString();

  const [deals, leads, staff, followups] = await Promise.all([
    supabase.from('deals').select('*').eq('organization_id', org).order('updated_at', { ascending: false }).limit(200),
    supabase.from('leads').select('id,name,phone,email,status,source').eq('organization_id', org).not('status', 'in', '("lost","purchased")').order('created_at', { ascending: false }).limit(200),
    supabase.from('profiles').select('id,full_name,role').eq('organization_id', org).eq('active', true).order('full_name'),
    supabase.from('lead_followups').select('*').eq('organization_id', org).eq('status', 'pending').lte('due_at', now).order('due_at', { ascending: true }).limit(20),
  ]);

  const staffMap = new Map((staff.data ?? []).map((member: any) => [member.id, member.full_name]));
  const leadMap = new Map((leads.data ?? []).map((lead: any) => [lead.id, lead]));
  const active = (deals.data ?? []).filter((deal: any) => !['won', 'lost'].includes(deal.stage));
  const pipeline = active.reduce((sum: number, deal: any) => sum + Number(deal.amount || 0), 0);
  const weighted = active.reduce((sum: number, deal: any) => sum + (Number(deal.amount || 0) * Number(deal.probability || 0)) / 100, 0);
  const won = (deals.data ?? []).filter((deal: any) => deal.stage === 'won').reduce((sum: number, deal: any) => sum + Number(deal.amount || 0), 0);

  const metrics = [
    ['Open pipeline', `₦${pipeline.toLocaleString()}`, 'from-cyan-500 to-blue-500'],
    ['Weighted', `₦${Math.round(weighted).toLocaleString()}`, 'from-violet-500 to-fuchsia-500'],
    ['Won value', `₦${won.toLocaleString()}`, 'from-emerald-400 to-teal-500'],
    ['Follow-ups due', String(followups.data?.length ?? 0), 'from-orange-400 to-rose-500'],
  ] as const;

  return (
    <WorkspaceShell title="Sales" subtitle="Revenue operations" profile={profile}>
      <div className="space-y-6">
        <section>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Revenue operations</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Sales command center</h1>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value, gradient]) => (
            <div key={label} className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${gradient}`} />
              <div className="mt-5 text-sm font-semibold text-slate-500">{label}</div>
              <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500" />
            <div>
              <div className="text-lg font-black text-slate-950">Create deal</div>
              <div className="text-xs font-medium text-slate-500">Add a sales opportunity</div>
            </div>
          </div>
          <DealQuickCreate leads={leads.data ?? []} staff={staff.data ?? []} />
        </section>

        {(followups.data?.length ?? 0) > 0 && (
          <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 className="text-lg font-black text-slate-950">Follow-ups due</h2>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">{followups.data?.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {(followups.data ?? []).map((followup: any) => {
                const lead: any = leadMap.get(followup.lead_id);
                return (
                  <div key={followup.id} className="grid gap-3 px-5 py-4 text-sm sm:px-6 lg:grid-cols-[1.4fr_.8fr_.8fr_auto] lg:items-center">
                    <div>
                      <div className="font-black text-slate-950">{lead?.name || lead?.phone || lead?.email || 'Lead'}</div>
                      <div className="mt-1 text-xs text-slate-500">{followup.channel} · {followup.notes || 'Follow up'}</div>
                    </div>
                    <div className="font-medium text-slate-600">{new Date(followup.due_at).toLocaleString()}</div>
                    <div className="font-medium text-slate-600">{staffMap.get(followup.assigned_to) || 'Unassigned'}</div>
                    <div><FollowupCompleteButton id={followup.id} /></div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stages.map((stage) => {
            const list = (deals.data ?? []).filter((deal: any) => deal.stage === stage);
            const value = list.reduce((sum: number, deal: any) => sum + Number(deal.amount || 0), 0);
            return (
              <div key={stage} className="rounded-[26px] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${stageStyles[stage]}`} />
                    <span className="text-sm font-black capitalize text-slate-900">{stage}</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{list.length}</span>
                </div>
                <div className="mb-3 text-xs font-black text-slate-400">₦{value.toLocaleString()}</div>

                <div className="space-y-3">
                  {list.map((deal: any) => (
                    <article key={deal.id} className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-slate-900">{deal.title}</h3>
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">{deal.probability}%</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">{deal.product_interest || deal.source || 'Sales opportunity'}</p>
                      <div className="mt-3 text-lg font-black text-slate-950">{deal.currency || 'NGN'} {Number(deal.amount || 0).toLocaleString()}</div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                        <span>{staffMap.get(deal.owner_id) || 'Unassigned'}</span>
                        <span>{deal.expected_close_at ? new Date(deal.expected_close_at).toLocaleDateString() : 'No close date'}</span>
                      </div>
                      <div className="mt-4 border-t border-slate-100 pt-3"><DealStageActions id={deal.id} stage={deal.stage} /></div>
                    </article>
                  ))}
                  {!list.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm font-medium text-slate-400">No deals</div>}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </WorkspaceShell>
  );
}
