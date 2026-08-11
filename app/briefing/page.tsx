import Link from 'next/link';
import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import { requireUser } from '@/lib/auth';

function naira(value: unknown) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export default async function BriefingPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const now = new Date().toISOString();

  const [taskQ, approvalQ, leadQ, campaignQ, recQ] = await Promise.all([
    supabase
      .from('tasks')
      .select('id,title,priority,due_at,status,assignee:profiles!tasks_assignee_id_fkey(full_name)')
      .eq('organization_id', org)
      .lt('due_at', now)
      .not('status', 'in', '("completed","approved","cancelled")')
      .order('due_at', { ascending: true })
      .limit(6),
    supabase
      .from('approvals')
      .select('id,entity_type,notes,created_at,requester:profiles!approvals_requested_by_fkey(full_name)')
      .eq('organization_id', org)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(6),
    supabase
      .from('leads')
      .select('id,name,phone,email,status,estimated_value,product_interest,source,assignee:profiles!leads_assigned_to_fkey(full_name)')
      .eq('organization_id', org)
      .in('status', ['interested', 'negotiating'])
      .order('estimated_value', { ascending: false })
      .limit(6),
    supabase
      .from('campaigns')
      .select('id,name,status,objective,budget,owner:profiles!campaigns_owner_id_fkey(full_name)')
      .eq('organization_id', org)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('growth_recommendations')
      .select('id,title,rationale,score')
      .eq('organization_id', org)
      .eq('status', 'new')
      .order('score', { ascending: false })
      .limit(5),
  ]);

  const overdueTasks = taskQ.data ?? [];
  const approvals = approvalQ.data ?? [];
  const hotLeads = leadQ.data ?? [];
  const campaigns = campaignQ.data ?? [];
  const recommendations = recQ.data ?? [];
  const hotLeadValue = hotLeads.reduce((sum: number, lead: any) => sum + Number(lead.estimated_value || 0), 0);

  const attentionScore = overdueTasks.length * 3 + approvals.length * 2 + hotLeads.length;
  const pressure = attentionScore >= 12 ? 'High' : attentionScore >= 5 ? 'Medium' : 'Low';

  return (
    <WorkspaceShell title="Daily Briefing" subtitle="Owner command summary" profile={profile}>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Owner briefing</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">What needs your attention today</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                WorkflowOS is combining execution, approvals, live sales opportunities and growth activity into one decision screen.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4">
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-300">Operating pressure</div>
              <div className="mt-1 text-2xl font-black">{pressure}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/tasks" className="rounded-2xl border border-rose-100 bg-rose-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-[10px] font-black uppercase tracking-wide text-rose-700">Overdue work</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{overdueTasks.length}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">Needs rescue</div>
          </Link>
          <Link href="/approvals" className="rounded-2xl border border-orange-100 bg-orange-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-[10px] font-black uppercase tracking-wide text-orange-700">Waiting on you</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{approvals.length}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">Pending approvals</div>
          </Link>
          <Link href="/leads" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Hot pipeline</div>
            <div className="mt-2 text-3xl font-black text-slate-950">{naira(hotLeadValue)}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">Interested + negotiating</div>
          </Link>
          <Link href="/campaigns" className="rounded-2xl border border-violet-100 bg-violet-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Growth live</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{campaigns.length}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">Active campaigns</div>
          </Link>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.17em] text-rose-600">Execution rescue</div>
                  <h2 className="mt-1 text-lg font-black text-slate-950">Overdue tasks</h2>
                </div>
                <Link href="/tasks" className="text-xs font-bold text-slate-500 hover:text-slate-950">All tasks →</Link>
              </div>
              <div className="mt-4 space-y-2">
                {overdueTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900">{task.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{task.assignee?.full_name || 'Unassigned'} · {task.priority || 'medium'} priority</div>
                    </div>
                    <div className="text-[10px] font-black uppercase text-rose-700">Overdue</div>
                  </div>
                ))}
                {!overdueTasks.length && <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-400">No overdue tasks.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.17em] text-emerald-600">Money now</div>
                  <h2 className="mt-1 text-lg font-black text-slate-950">Hot leads to close</h2>
                </div>
                <Link href="/leads" className="text-xs font-bold text-slate-500 hover:text-slate-950">Pipeline →</Link>
              </div>
              <div className="mt-4 space-y-2">
                {hotLeads.map((lead: any) => (
                  <div key={lead.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{lead.name || lead.phone || lead.email || 'Unnamed lead'}</div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">{lead.product_interest || 'General inquiry'} · {lead.assignee?.full_name || 'Unassigned'}</div>
                      </div>
                      <strong className="shrink-0 text-sm font-black text-emerald-700">{naira(lead.estimated_value)}</strong>
                    </div>
                  </div>
                ))}
                {!hotLeads.length && <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-400">No hot leads yet.</div>}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.17em] text-orange-600">Decision queue</div>
                  <h2 className="mt-1 text-lg font-black text-slate-950">Approvals waiting</h2>
                </div>
                <Link href="/approvals" className="text-xs font-bold text-slate-500 hover:text-slate-950">Review →</Link>
              </div>
              <div className="mt-4 space-y-2">
                {approvals.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="text-sm font-bold capitalize text-slate-900">{String(item.entity_type || 'request').replaceAll('_', ' ')}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{item.requester?.full_name || 'System'} · {item.notes || 'No notes'}</div>
                  </div>
                ))}
                {!approvals.length && <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-400">Approval queue is clear.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.17em] text-violet-600">AI opportunity radar</div>
                  <h2 className="mt-1 text-lg font-black text-slate-950">Best next moves</h2>
                </div>
                <Link href="/opportunities" className="text-xs font-bold text-slate-500 hover:text-slate-950">Opportunities →</Link>
              </div>
              <div className="mt-4 space-y-2">
                {recommendations.map((item: any) => (
                  <div key={item.id} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xs font-black text-violet-700">{Number(item.score || 0).toFixed(0)}</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">{item.title}</div>
                      {item.rationale && <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.rationale}</div>}
                    </div>
                  </div>
                ))}
                {!recommendations.length && <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-400">No new recommendations.</div>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
