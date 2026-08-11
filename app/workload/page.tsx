import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

export default async function Workload() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [{ data: people }, { data: tasks }, { data: time }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,role,department,active').eq('organization_id', profile.organization_id).eq('active', true).order('full_name'),
    supabase.from('tasks').select('id,assignee_id,status,priority,due_at').eq('organization_id', profile.organization_id).not('status', 'in', '("completed","cancelled")'),
    supabase.from('time_entries').select('user_id,started_at,ended_at').eq('organization_id', profile.organization_id).gte('started_at', since),
  ]);

  const now = Date.now();
  const rows = (people ?? [])
    .map((person: any) => {
      const personTasks = (tasks ?? []).filter((task: any) => task.assignee_id === person.id);
      const overdue = personTasks.filter((task: any) => task.due_at && new Date(task.due_at).getTime() < now && !['submitted', 'approved'].includes(task.status)).length;
      const urgent = personTasks.filter((task: any) => task.priority === 'urgent').length;
      const mins = (time ?? [])
        .filter((entry: any) => entry.user_id === person.id && entry.ended_at)
        .reduce((total: number, entry: any) => total + Math.max(0, (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60000), 0);
      const load = Math.min(100, personTasks.length * 12 + overdue * 15 + urgent * 12);
      return { ...person, open: personTasks.length, overdue, urgent, hours: Math.round(mins / 6) / 10, load };
    })
    .sort((a: any, b: any) => b.load - a.load);

  const overloaded = rows.filter((person: any) => person.load >= 75).length;
  const available = rows.filter((person: any) => person.load < 40).length;

  return (
    <WorkspaceShell title="Workload" subtitle="Team capacity" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Planning</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Workload</h1>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-rose-700">High load</div>
              <div className="text-xl font-black text-slate-950">{overloaded}</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Available</div>
              <div className="text-xl font-black text-slate-950">{available}</div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 text-[10px] font-black uppercase tracking-wide text-slate-500 sm:px-6 lg:grid-cols-[1.2fr_.5fr_.8fr_.7fr_1fr]">
            <div>Staff</div><div>Open</div><div>Risk</div><div>7-day effort</div><div>Load</div>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.map((person: any) => {
              const loadGradient = person.load >= 75 ? 'from-orange-400 to-rose-500' : person.load >= 40 ? 'from-cyan-500 to-blue-500' : 'from-emerald-400 to-teal-500';
              return (
                <div key={person.id} className="grid gap-3 px-5 py-4 text-sm sm:px-6 lg:grid-cols-[1.2fr_.5fr_.8fr_.7fr_1fr] lg:items-center">
                  <div>
                    <div className="font-black text-slate-950">{person.full_name}</div>
                    <div className="mt-1 text-xs text-slate-500">{person.role}{person.department ? ` · ${person.department}` : ''}</div>
                  </div>
                  <div className="font-black text-slate-700">{person.open}</div>
                  <div>
                    <div className={person.overdue ? 'font-black text-rose-700' : 'font-bold text-slate-500'}>{person.overdue} overdue</div>
                    <div className="mt-1 text-xs text-orange-600">{person.urgent} urgent</div>
                  </div>
                  <div className="font-bold text-slate-700">{person.hours}h</div>
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full bg-gradient-to-r ${loadGradient}`} style={{ width: `${person.load}%` }} />
                    </div>
                    <div className="mt-2 text-xs font-bold text-slate-500">{person.load}% · {person.load >= 75 ? 'High' : person.load >= 40 ? 'Balanced' : 'Available'}</div>
                  </div>
                </div>
              );
            })}

            {!rows.length && <div className="p-8 text-sm font-medium text-slate-500">No active staff found.</div>}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
