import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

const quickLinks = [
  ['Today', '/today', '☀', 'from-amber-400 to-orange-500'],
  ['Tasks', '/tasks', '✓', 'from-emerald-400 to-teal-500'],
  ['Opportunities', '/opportunities', '✦', 'from-violet-500 to-fuchsia-500'],
  ['Buyer Radar', '/buyers/radar', '◉', 'from-cyan-400 to-blue-500'],
  ['Leads', '/leads', '◎', 'from-sky-400 to-cyan-500'],
  ['Campaigns', '/campaigns', '☆', 'from-pink-500 to-rose-500'],
  ['Automations', '/automations', '⚡', 'from-yellow-400 to-amber-500'],
  ['Analytics', '/analytics', '⌁', 'from-indigo-500 to-violet-500'],
] as const;

const metricStyles = [
  {
    accent: 'from-violet-500 to-fuchsia-500',
    tint: 'from-violet-50 to-fuchsia-50/80',
    icon: '✦',
    note: 'text-violet-700',
  },
  {
    accent: 'from-cyan-500 to-blue-500',
    tint: 'from-cyan-50 to-blue-50/80',
    icon: '☆',
    note: 'text-cyan-700',
  },
  {
    accent: 'from-emerald-400 to-teal-500',
    tint: 'from-emerald-50 to-teal-50/80',
    icon: '◎',
    note: 'text-emerald-700',
  },
  {
    accent: 'from-orange-400 to-rose-500',
    tint: 'from-orange-50 to-rose-50/80',
    icon: '!',
    note: 'text-orange-700',
  },
] as const;

function getGreeting() {
  const parts = new Intl.DateTimeFormat('en-NG', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'Africa/Lagos',
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 12);
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function Dashboard() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;

  const [recQ, campQ, leadQ, taskQ, topQ] = await Promise.all([
    supabase
      .from('growth_recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org)
      .eq('status', 'new'),
    supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org)
      .eq('status', 'active'),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org)
      .in('status', ['new', 'contacted', 'interested', 'negotiating']),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org)
      .lt('due_at', new Date().toISOString())
      .not('status', 'in', '("completed","approved","cancelled")'),
    supabase
      .from('growth_recommendations')
      .select('id,title,rationale,score,status')
      .eq('organization_id', org)
      .eq('status', 'new')
      .order('score', { ascending: false })
      .limit(4),
  ]);

  const metrics = [
    ['Growth signals', String(recQ.count ?? 0), 'New'],
    ['Active campaigns', String(campQ.count ?? 0), 'Live'],
    ['Open leads', String(leadQ.count ?? 0), 'Pipeline'],
    ['Overdue tasks', String(taskQ.count ?? 0), 'Attention'],
  ] as const;

  const firstName = profile.role === 'owner' ? 'GADGETPOINT' : profile.full_name?.split(' ')[0] || 'there';
  const dateLabel = new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date());

  return (
    <WorkspaceShell title="Overview" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {dateLabel}
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {getGreeting()}, {firstName}.
            </h1>
          </div>

          <div className="flex gap-2">
            <Link
              href="/today"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Open today
            </Link>
            <Link
              href="/tasks"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              + Assign work
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" />
              <span className="text-[10px] font-black uppercase tracking-[0.17em] text-emerald-700">Live workspace</span>
            </div>
            <Link href="/activity" className="text-xs font-bold text-slate-500 transition hover:text-slate-900">
              View activity →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, note], index) => {
              const style = metricStyles[index];
              return (
                <div
                  key={label}
                  className={`relative overflow-hidden border-slate-100 bg-gradient-to-br ${style.tint} p-5 sm:border-r last:border-r-0`}
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${style.accent}`} />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
                      <div className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</div>
                      <div className={`mt-2 text-[10px] font-black uppercase tracking-wide ${style.note}`}>{note}</div>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${style.accent} text-sm font-black text-white shadow-lg`}>
                      {style.icon}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.17em] text-violet-600">Next moves</div>
                <h2 className="mt-1 text-lg font-black text-slate-950">Recommended actions</h2>
              </div>
              <Link href="/opportunities" className="text-xs font-bold text-violet-700">View all →</Link>
            </div>

            <div className="mt-4 space-y-2">
              {(topQ.data ?? []).map((item: any, index: number) => {
                const accents = [
                  'from-violet-500 to-fuchsia-500',
                  'from-cyan-500 to-blue-500',
                  'from-emerald-400 to-teal-500',
                  'from-orange-400 to-rose-500',
                ];
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accents[index % accents.length]} text-xs font-black text-white`}>
                      {Number(item.score).toFixed(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900">{item.title}</div>
                      {item.rationale && <div className="mt-0.5 truncate text-xs text-slate-500">{item.rationale}</div>}
                    </div>
                  </div>
                );
              })}

              {!topQ.data?.length && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400">
                  No new recommendations.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-600">Quick access</div>
            <h2 className="mt-1 text-lg font-black text-slate-950">Workspace</h2>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {quickLinks.map(([label, href, icon, gradient]) => (
                <Link
                  href={href}
                  key={href}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-xs font-black text-white`}>
                    {icon}
                  </span>
                  <span className="truncate text-xs font-bold text-slate-800">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
