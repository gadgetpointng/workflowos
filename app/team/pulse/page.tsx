import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import { requireUser } from '@/lib/auth';

type Person = {
  id: string;
  full_name?: string | null;
  role?: string | null;
  department?: string | null;
  active?: boolean | null;
};

type Task = {
  id: string;
  assignee_id?: string | null;
  status?: string | null;
  due_at?: string | null;
  priority?: string | null;
};

export default async function TeamPulsePage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const now = new Date();

  const [{ data: peopleData }, { data: taskData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,full_name,role,department,active')
      .eq('organization_id', org)
      .eq('active', true)
      .order('full_name'),
    supabase
      .from('tasks')
      .select('id,assignee_id,status,due_at,priority')
      .eq('organization_id', org)
      .not('status', 'in', '("completed","approved","cancelled")')
      .limit(500),
  ]);

  const people = (peopleData ?? []) as Person[];
  const tasks = (taskData ?? []) as Task[];

  const rows = people.map((person) => {
    const assigned = tasks.filter((task) => task.assignee_id === person.id);
    const overdue = assigned.filter((task) => task.due_at && new Date(task.due_at) < now);
    const submitted = assigned.filter((task) => task.status === 'submitted');
    const urgent = assigned.filter((task) => task.priority === 'urgent' || task.priority === 'high');
    return {
      person,
      open: assigned.length,
      overdue: overdue.length,
      submitted: submitted.length,
      urgent: urgent.length,
    };
  });

  const unassigned = tasks.filter((task) => !task.assignee_id).length;
  const totalOverdue = rows.reduce((sum, row) => sum + row.overdue, 0);
  const totalSubmitted = rows.reduce((sum, row) => sum + row.submitted, 0);
  const busiest = [...rows].sort((a, b) => b.open - a.open)[0];

  return (
    <WorkspaceShell title="Team Pulse" subtitle="Staff accountability snapshot" profile={profile}>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-blue-200 bg-gradient-to-br from-blue-950 via-slate-950 to-violet-950 p-6 text-white shadow-xl sm:p-8">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Team accountability</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">See who is carrying work and where things are stuck</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This snapshot uses live WorkflowOS tasks to show workload, overdue work and submissions for every active staff member.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-cyan-700">Active staff</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{people.length}</div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-rose-700">Overdue work</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{totalOverdue}</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Submitted</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{totalSubmitted}</div>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-orange-700">Unassigned tasks</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{unassigned}</div>
          </div>
        </section>

        {busiest && (
          <section className="rounded-2xl border border-violet-100 bg-violet-50/80 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Highest current workload</div>
            <div className="mt-2 text-lg font-black text-slate-950">{busiest.person.full_name || 'Unnamed staff'} · {busiest.open} open tasks</div>
          </section>
        )}

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.17em] text-blue-600">Live workload</div>
              <h2 className="mt-1 text-lg font-black text-slate-950">Staff snapshot</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{rows.length}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div key={row.person.id} className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[1.4fr_.6fr_.6fr_.6fr_.6fr] lg:items-center">
                <div className="min-w-0">
                  <div className="truncate font-black text-slate-950">{row.person.full_name || 'Unnamed staff'}</div>
                  <div className="mt-1 text-xs font-medium capitalize text-slate-500">
                    {row.person.role || 'member'}{row.person.department ? ` · ${row.person.department}` : ''}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Open</div>
                  <div className="mt-1 text-xl font-black text-slate-950">{row.open}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-rose-500">Overdue</div>
                  <div className="mt-1 text-xl font-black text-rose-700">{row.overdue}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-emerald-600">Submitted</div>
                  <div className="mt-1 text-xl font-black text-emerald-700">{row.submitted}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wide text-orange-600">High / urgent</div>
                  <div className="mt-1 text-xl font-black text-orange-700">{row.urgent}</div>
                </div>
              </div>
            ))}

            {!rows.length && <div className="p-8 text-sm font-semibold text-slate-500">No active staff profiles found.</div>}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
