import { redirect } from 'next/navigation';
import { canManage, requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import AIProposalActions from '@/components/AIProposalActions';
import AIProposalCreate from '@/components/AIProposalCreate';

const statusStyles: Record<string, string> = {
  pending_approval: 'bg-orange-50 text-orange-700',
  approved: 'bg-emerald-50 text-emerald-700',
  executed: 'bg-cyan-50 text-cyan-700',
  rejected: 'bg-rose-50 text-rose-700',
  failed: 'bg-rose-50 text-rose-700',
};

export default async function AIProposalsPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data: items } = await supabase
    .from('ai_proposals')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(100);

  const pending = (items ?? []).filter((item: any) => item.status === 'pending_approval').length;

  return (
    <WorkspaceShell title="AI Proposals" subtitle="Controlled AI actions" profile={profile}>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-xl sm:p-7">
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-violet-500/40 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">Controlled execution</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">AI action proposals</h1>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-wide text-orange-200">Awaiting review</div>
              <div className="mt-1 text-2xl font-black">{pending}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500" />
              <div>
                <div className="text-lg font-black text-slate-950">New proposal</div>
                <div className="text-xs font-medium text-slate-500">Create a reviewable action</div>
              </div>
            </div>
            <AIProposalCreate />
          </div>

          <div className="space-y-4">
            {(items ?? []).map((proposal: any, index: number) => {
              const gradients = [
                'from-violet-500 to-fuchsia-500',
                'from-cyan-500 to-blue-500',
                'from-emerald-400 to-teal-500',
                'from-orange-400 to-rose-500',
              ];
              return (
                <article key={proposal.id} className="overflow-hidden rounded-[26px] border border-white/80 bg-white/90 shadow-sm">
                  <div className={`h-1.5 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase text-violet-700">
                          {proposal.proposal_type.replaceAll('_', ' ')}
                        </span>
                        <h2 className="mt-3 text-lg font-black text-slate-950">{proposal.title}</h2>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusStyles[proposal.status] || 'bg-slate-100 text-slate-600'}`}>
                        {proposal.status.replaceAll('_', ' ')}
                      </span>
                    </div>

                    {proposal.summary && <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{proposal.summary}</p>}

                    <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">Execution payload</summary>
                      <pre className="mt-3 overflow-x-auto text-xs text-slate-600">{JSON.stringify(proposal.payload, null, 2)}</pre>
                    </details>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <span className="text-xs font-medium text-slate-400">{new Date(proposal.created_at).toLocaleString()}</span>
                      {canManage(profile.role) && <AIProposalActions id={proposal.id} status={proposal.status} />}
                    </div>
                  </div>
                </article>
              );
            })}

            {!items?.length && (
              <div className="rounded-[28px] border border-dashed border-violet-200 bg-violet-50/60 p-8 text-sm font-medium text-slate-500">No AI proposals yet.</div>
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
