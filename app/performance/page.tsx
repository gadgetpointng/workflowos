import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

export default async function Performance() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: people }, { data: tasks }, { data: time }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,role,department,active').eq('organization_id', profile.organization_id).eq('active', true).order('full_name'),
    supabase.from('tasks').select('id,assignee_id,status,priority,due_at,created_at,updated_at').eq('organization_id', profile.organization_id).gte('created_at', since),
    supabase.from('time_entries').select('user_id,started_at,ended_at').eq('organization_id', profile.organization_id).gte('started_at', since),
  ]);

  const now = Date.now();
  const rows = (people ?? [])
    .map((person: any) => {
      const personTasks = (tasks ?? []).filter((task: any) => task.assignee_id === person.id);
      const completed = personTasks.filter((task: any) => ['approved', 'completed'].includes(task.status)).length;
      const overdue = personTasks.filter((task: any) => task.due_at && new Date(task.due_at).getTime() < now && !['approved', 'completed', 'cancelled'].includes(task.status)).length;
      const mins = (time ?? [])
        .filter((entry: any) => entry.user_id === person.id && entry.ended_at)
        .reduce((total: number, entry: any) => total + Math.max(0, (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60000), 0);
      const completion = personTasks.length ? Math.round((completed / personTasks.length) * 100) : 0;
      const score = Math.max(0, Math.min(100, Math.round(completion - overdue * 7 + Math.min(completed * 2, 15))));
      return { ...person, total: personTasks.length, completed, overdue, hours: Math.round(mins / 6) / 10, completion, score };
    })
    .sort((a: any, b: any) => b.score - a.score);

  const average = rows.length ? Math.round(rows.reduce((sum: number, row: any) => sum + row.score, 0) / rows.length) : 0;

  return (
    <WorkspaceShell title="Performance" subtitle="30-day scorecard" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">People intelligence</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Staff performance</h1>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Average score</div>
            <div className="text-xl font-black text-slate-950">{average}</div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-sm">
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500 sm:px-6 lg:grid-cols-[1.2fr_.7fr_.7fr_.6fr_.7fr_.6fr]">
            <div>Staff</div><div>Completed</div><div>Completion</div><div>Overdue</div><div>Effort</div><div>Score</div>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.map((person: any) => {
              const scoreClass = person.score >= 80 ? 'from-emerald-400 to-teal-500' : person.score >= 55 ? 'from-cyan-500 to-blue-500' : 'from-orange-400 to-rose-500';
              return (
                <div key={person.id} className="grid gap-3 px-5 py-4 text-sm sm:px-6 lg:grid-cols-[1.2fr_.7fr_.7fr_.6fr_.7fr_.6fr] lg:items-center">
                  <div>
                    <div className="font-black text-slate-950">{person.full_name}</div>
                    <div className="mt-1 text-xs text-slate-500">{person.role}{person.department ? ` · ${person.department}` : ''}</div>
                  </div>
                  <div className="font-bold text-slate-700">{person.completed}/{person.total}</div>
                  <div className="font-bold text-cyan-700">{person.completion}%</div>
                  <div className={person.overdue ? 'font-black text-rose-700' : 'font-bold text-slate-500'}>{person.overdue}</div>
                  <div className="font-bold text-slate-700">{person.hours}h</div>
                  <div className="flex items-center gap-2">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${scoreClass} text-sm font-black text-white`}>{person.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
