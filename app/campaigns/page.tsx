import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import CampaignQuickCreate from '@/components/CampaignQuickCreate';
import CampaignTaskGenerator from '@/components/CampaignTaskGenerator';

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  planned: 'bg-cyan-50 text-cyan-700',
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  completed: 'bg-violet-50 text-violet-700',
};

export default async function Campaigns() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*,owner:profiles!campaigns_owner_id_fkey(full_name),campaign_tasks(task_id)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(100);

  const active = (campaigns ?? []).filter((campaign: any) => campaign.status === 'active').length;
  const planned = (campaigns ?? []).filter((campaign: any) => ['draft', 'planned'].includes(campaign.status)).length;

  return (
    <WorkspaceShell title="Campaigns" subtitle="Growth execution" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-pink-600">Growth</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Campaign manager</h1>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Active</div>
              <div className="text-xl font-black text-slate-950">{active}</div>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Planned</div>
              <div className="text-xl font-black text-slate-950">{planned}</div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-500" />
            <div>
              <div className="text-lg font-black text-slate-950">New campaign</div>
              <div className="text-xs font-medium text-slate-500">Plan the next growth push</div>
            </div>
          </div>
          <CampaignQuickCreate />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(campaigns ?? []).map((campaign: any, index: number) => {
            const gradients = [
              'from-violet-500 to-fuchsia-500',
              'from-cyan-500 to-blue-500',
              'from-emerald-400 to-teal-500',
              'from-orange-400 to-rose-500',
              'from-pink-500 to-purple-500',
              'from-amber-400 to-orange-500',
            ];

            return (
              <article key={campaign.id} className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className={`h-1.5 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusStyles[campaign.status] || statusStyles.draft}`}>
                        {campaign.status}
                      </span>
                      <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">{campaign.name}</h2>
                    </div>
                    {campaign.budget != null && (
                      <strong className="shrink-0 text-lg font-black text-slate-950">₦{Number(campaign.budget).toLocaleString()}</strong>
                    )}
                  </div>

                  {campaign.objective && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{campaign.objective}</p>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-cyan-50/70 p-3">
                      <div className="text-[10px] font-black uppercase tracking-wide text-cyan-700">Audience</div>
                      <div className="mt-1 truncate text-sm font-bold text-slate-900">{campaign.target_audience || '—'}</div>
                    </div>
                    <div className="rounded-2xl bg-violet-50/70 p-3">
                      <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Owner</div>
                      <div className="mt-1 truncate text-sm font-bold text-slate-900">{campaign.owner?.full_name || 'Unassigned'}</div>
                    </div>
                    <div className="rounded-2xl bg-orange-50/70 p-3">
                      <div className="text-[10px] font-black uppercase tracking-wide text-orange-700">Starts</div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{campaign.starts_at ? new Date(campaign.starts_at).toLocaleDateString() : '—'}</div>
                    </div>
                    <div className="rounded-2xl bg-emerald-50/70 p-3">
                      <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Tasks</div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{campaign.campaign_tasks?.length ?? 0}</div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <CampaignTaskGenerator campaignId={campaign.id} />
                  </div>
                </div>
              </article>
            );
          })}

          {!campaigns?.length && (
            <div className="rounded-[28px] border border-dashed border-pink-200 bg-pink-50/60 p-8 text-sm font-medium text-slate-500">
              No campaigns yet.
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
