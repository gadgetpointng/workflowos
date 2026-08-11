import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import { requireUser } from '@/lib/auth';

function naira(value: unknown) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export default async function BranchRadarPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const now = new Date();

  const [{ data: peopleData }, { data: taskData }, { data: leadData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,full_name,department,role,active')
      .eq('organization_id', org)
      .eq('active', true),
    supabase
      .from('tasks')
      .select('id,assignee_id,status,due_at')
      .eq('organization_id', org)
      .not('status', 'in', '("completed","approved","cancelled")')
      .limit(500),
    supabase
      .from('leads')
      .select('id,assigned_to,status,estimated_value')
      .eq('organization_id', org)
      .in('status', ['new', 'contacted', 'interested', 'negotiating'])
      .limit(500),
  ]);

  const people = peopleData ?? [];
  const tasks = taskData ?? [];
  const leads = leadData ?? [];

  const branchNames = Array.from(
    new Set((people as any[]).map((person) => String(person.department || 'Unassigned')))
  ).sort();

  const rows = branchNames.map((branch) => {
    const branchPeople = (people as any[]).filter((person) => String(person.department || 'Unassigned') === branch);
    const ids = new Set(branchPeople.map((person) => person.id));
    const branchTasks = (tasks as any[]).filter((task) => task.assignee_id && ids.has(task.assignee_id));
    const overdue = branchTasks.filter((task) => task.due_at && new Date(task.due_at) < now);
    const branchLeads = (leads as any[]).filter((lead) => lead.assigned_to && ids.has(lead.assigned_to));
    const pipeline = branchLeads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
    const negotiating = branchLeads.filter((lead) => lead.status === 'negotiating').length;
    return {
      branch,
      staff: branchPeople.length,
      openTasks: branchTasks.length,
      overdue: overdue.length,
      openLeads: branchLeads.length,
      pipeline,
      negotiating,
    };
  });

  const totalPipeline = rows.reduce((sum, row) => sum + row.pipeline, 0);
  const totalOverdue = rows.reduce((sum, row) => sum + row.overdue, 0);
  const strongestPipeline = [...rows].sort((a, b) => b.pipeline - a.pipeline)[0];
  const mostPressure = [...rows].sort((a, b) => b.overdue - a.overdue)[0];

  return (
    <WorkspaceShell title="Branch Radar" subtitle="Compare branch execution and sales pressure" profile={profile}>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-cyan-200 bg-gradient-to-br from-cyan-950 via-slate-950 to-blue-950 p-6 text-white shadow-xl sm:p-8">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Branch radar</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">See where execution is strong and where pressure is building</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              WorkflowOS groups staff by the branch or department synced from GadgetPoint, then compares workload and open sales pipeline.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-cyan-700">Branches</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{rows.length}</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Open pipeline</div>
            <div className="mt-2 text-3xl font-black text-slate-950">{naira(totalPipeline)}</div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-rose-700">Overdue tasks</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{totalOverdue}</div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Staff covered</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{people.length}</div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Strongest sales pipeline</div>
            <div className="mt-2 text-lg font-black text-slate-950">
              {strongestPipeline ? `${strongestPipeline.branch} · ${naira(strongestPipeline.pipeline)}` : 'No branch data yet'}
            </div>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-orange-700">Most execution pressure</div>
            <div className="mt-2 text-lg font-black text-slate-950">
              {mostPressure ? `${mostPressure.branch} · ${mostPressure.overdue} overdue` : 'No branch data yet'}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.17em] text-blue-600">Comparison</div>
              <h2 className="mt-1 text-lg font-black text-slate-950">Branch snapshot</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{rows.length}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div key={row.branch} className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[1.2fr_.5fr_.6fr_.6fr_.8fr_.6fr] lg:items-center">
                <div>
                  <div className="font-black text-slate-950">{row.branch}</div>
                  <div className="mt-1 text-xs font-medium text-slate-500">{row.staff} active staff</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Tasks</div>
                  <div className="mt-1 text-xl font-black text-slate-950">{row.openTasks}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-rose-500">Overdue</div>
                  <div className="mt-1 text-xl font-black text-rose-700">{row.overdue}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-cyan-600">Leads</div>
                  <div className="mt-1 text-xl font-black text-cyan-700">{row.openLeads}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-emerald-600">Pipeline</div>
                  <div className="mt-1 text-lg font-black text-emerald-700">{naira(row.pipeline)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-orange-600">Negotiating</div>
                  <div className="mt-1 text-xl font-black text-orange-700">{row.negotiating}</div>
                </div>
              </div>
            ))}

            {!rows.length && <div className="p-8 text-sm font-semibold text-slate-500">No branch-linked staff data yet.</div>}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
