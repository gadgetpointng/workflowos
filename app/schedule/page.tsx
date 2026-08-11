import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import ScheduleQuickCreate from '@/components/ScheduleQuickCreate';

export default async function Page() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const from = new Date(Date.now() - 86400000).toISOString();
  const to = new Date(Date.now() + 14 * 86400000).toISOString();

  const { data: events } = await supabase
    .from('schedule_events')
    .select('*,owner:profiles!schedule_events_owner_id_fkey(full_name)')
    .eq('organization_id', profile.organization_id)
    .gte('starts_at', from)
    .lte('starts_at', to)
    .order('starts_at');

  const todayKey = new Date().toDateString();
  const todayCount = (events ?? []).filter((event: any) => new Date(event.starts_at).toDateString() === todayKey).length;

  return (
    <WorkspaceShell title="Schedule" subtitle="Next 14 days" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Planning</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Schedule</h1>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-blue-700">Today</div>
            <div className="text-xl font-black text-slate-950">{todayCount}</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500" />
            <div>
              <div className="text-lg font-black text-slate-950">Add to schedule</div>
              <div className="text-xs font-medium text-slate-500">Create an event</div>
            </div>
          </div>
          <ScheduleQuickCreate />
        </section>

        <section className="space-y-3">
          {(events ?? []).map((event: any, index: number) => {
            const gradients = [
              'from-blue-500 to-cyan-500',
              'from-violet-500 to-fuchsia-500',
              'from-emerald-400 to-teal-500',
              'from-orange-400 to-rose-500',
            ];
            return (
              <article key={event.id} className="grid gap-4 rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-sm sm:p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[index % gradients.length]} text-xs font-black text-white`}>
                  {new Date(event.starts_at).getDate()}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-slate-950">{event.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{event.owner?.full_name || 'Workspace'} · {event.event_type}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-700">{new Date(event.starts_at).toLocaleDateString()}</span>
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">{new Date(event.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </article>
            );
          })}

          {!events?.length && (
            <div className="rounded-[28px] border border-dashed border-blue-200 bg-blue-50/60 p-8 text-sm font-medium text-slate-500">Nothing scheduled yet.</div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
