import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

function getGreeting() {
  const parts = new Intl.DateTimeFormat('en-NG', { hour: '2-digit', hour12: false, timeZone: 'Africa/Lagos' }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 12);
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatusDot({ tone = 'green' }: { tone?: 'green' | 'amber' | 'red' | 'gray' }) {
  const classes = {
    green: 'bg-[#3ecf8e]',
    amber: 'bg-[#e5a54b]',
    red: 'bg-[#e5484d]',
    gray: 'bg-[#9ca3af]',
  } as const;
  return <span className={`inline-block h-2 w-2 rounded-full ${classes[tone]}`} />;
}

export default async function Dashboard() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const role = String(profile.role || 'member').toLowerCase();
  const email = String(profile.email ?? user.email ?? '').trim().toLowerCase();
  const isOwner = role === 'owner' && email === OWNER_EMAIL;
  const canManage = ['owner', 'admin', 'manager'].includes(role);
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    recQ,
    campQ,
    leadQ,
    taskQ,
    topQ,
    approvalQ,
    teamQ,
    bridgeQ,
    activityQ,
    routineQ,
    slaQ,
    notificationQ,
  ] = await Promise.all([
    supabase.from('growth_recommendations').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'new'),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'active'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org).in('status', ['new', 'contacted', 'interested', 'negotiating']),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('organization_id', org).not('status', 'in', '("completed","approved","cancelled")'),
    supabase.from('growth_recommendations').select('id,title,rationale,score,status,recommendation_type').eq('organization_id', org).eq('status', 'new').order('score', { ascending: false }).limit(5),
    canManage ? supabase.from('approvals').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'pending') : Promise.resolve({ count: 0 }),
    canManage ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('active', true) : Promise.resolve({ count: 0 }),
    canManage ? supabase.from('external_integrations').select('id,status,last_synced_at').eq('organization_id', org).eq('slug', 'gadgetpoint').maybeSingle() : Promise.resolve({ data: null }),
    canManage ? supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('organization_id', org).gte('created_at', dayAgo) : Promise.resolve({ count: 0 }),
    canManage ? supabase.from('recurring_work_templates').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('active', true) : Promise.resolve({ count: 0 }),
    canManage ? supabase.from('sla_rules').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('active', true) : Promise.resolve({ count: 0 }),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('organization_id', org).is('read_at', null),
  ]);

  const bridgeData = bridgeQ.data as { status?: string | null; last_synced_at?: string | null } | null;
  const bridgeConnected = Boolean(bridgeData && ['active', 'connected'].includes(String(bridgeData.status || '').toLowerCase()));
  const firstName = profile.full_name?.split(' ')[0] || 'there';
  const dateLabel = new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(now);

  const metrics = [
    { label: 'Open work', value: taskQ.count ?? 0, href: '/tasks', note: 'Tasks in motion' },
    { label: 'Opportunities', value: recQ.count ?? 0, href: '/opportunities', note: 'Awaiting decisions' },
    { label: 'Open leads', value: leadQ.count ?? 0, href: '/leads', note: 'Sales pipeline' },
    { label: 'Unread', value: notificationQ.count ?? 0, href: '/notifications', note: 'Notifications' },
  ];

  const systemRows = [
    {
      label: 'GadgetPoint bridge',
      value: bridgeConnected ? 'Connected' : bridgeData ? 'Needs setup' : 'Pending',
      detail: bridgeData?.last_synced_at ? `Last sync ${new Date(bridgeData.last_synced_at).toLocaleString()}` : 'External identity connection paused',
      href: '/integrations',
      tone: bridgeConnected ? 'green' as const : 'amber' as const,
    },
    {
      label: 'Recurring routines',
      value: `${routineQ.count ?? 0} active`,
      detail: 'Automatic operating work',
      href: '/recurring-work',
      tone: (routineQ.count ?? 0) > 0 ? 'green' as const : 'gray' as const,
    },
    {
      label: 'Response SLA',
      value: `${slaQ.count ?? 0} active`,
      detail: 'Lead follow-up protection',
      href: '/sla',
      tone: (slaQ.count ?? 0) > 0 ? 'green' as const : 'gray' as const,
    },
    {
      label: 'Activity · 24h',
      value: String(activityQ.count ?? 0),
      detail: 'Recorded operating events',
      href: '/activity',
      tone: 'green' as const,
    },
  ];

  return (
    <WorkspaceShell title="Overview" profile={profile}>
      <div className="mx-auto max-w-[1380px] space-y-5">
        <section className="flex flex-col gap-4 border-b border-[#e5e5e5] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-medium text-[#737373]">{dateLabel}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#171717] sm:text-[28px]">{getGreeting()}, {firstName}</h1>
            <p className="mt-1.5 text-sm text-[#737373]">Business operations, decisions and system health in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/today" className="rounded-md border border-[#d4d4d4] bg-white px-3 py-2 text-xs font-medium text-[#262626] transition hover:bg-[#fafafa]">Today</Link>
            <Link href="/tasks" className="rounded-md border border-[#d4d4d4] bg-white px-3 py-2 text-xs font-medium text-[#262626] transition hover:bg-[#fafafa]">Tasks</Link>
            {isOwner && <Link href="/owner" className="rounded-md border border-[#2e2e2e] bg-[#202020] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#2a2a2a]">Owner control</Link>}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
          <div className="flex items-center justify-between border-b border-[#ededed] px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-[#404040]"><StatusDot /><span>Operating summary</span></div>
            <span className="text-[11px] text-[#8a8a8a]">Live workspace</span>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <Link href={metric.href} key={metric.label} className={`group px-4 py-4 transition hover:bg-[#fafafa] ${index > 0 ? 'border-t border-[#ededed] sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'sm:border-l-0 xl:border-l' : ''}`}>
                <div className="text-[11px] font-medium text-[#737373]">{metric.label}</div>
                <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-[#171717]">{metric.value}</div>
                <div className="mt-1 text-[11px] text-[#a3a3a3] group-hover:text-[#737373]">{metric.note}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
            <div className="flex items-center justify-between border-b border-[#ededed] px-4 py-3">
              <div>
                <div className="text-xs font-medium text-[#262626]">Decision queue</div>
                <div className="mt-0.5 text-[11px] text-[#8a8a8a]">Highest-value actions waiting for review</div>
              </div>
              <Link href="/opportunities" className="text-xs font-medium text-[#2e8b67] hover:text-[#1f6f52]">View all</Link>
            </div>

            <div className="divide-y divide-[#ededed]">
              {(topQ.data ?? []).map((item: any) => (
                <Link href="/opportunities" key={item.id} className="grid gap-3 px-4 py-3.5 transition hover:bg-[#fafafa] sm:grid-cols-[56px_1fr_auto] sm:items-center">
                  <div className="flex h-8 w-11 items-center justify-center rounded-md border border-[#ccebdc] bg-[#f1fbf6] text-xs font-semibold tabular-nums text-[#1f7a57]">{Number(item.score).toFixed(0)}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[#262626]">{item.title}</div>
                    <div className="mt-0.5 truncate text-[11px] text-[#8a8a8a]">{item.rationale || String(item.recommendation_type || 'Recommended action').replaceAll('_', ' ')}</div>
                  </div>
                  <span className="text-[11px] text-[#a3a3a3]">Review →</span>
                </Link>
              ))}
              {!topQ.data?.length && (
                <div className="px-4 py-10 text-center">
                  <div className="text-sm font-medium text-[#404040]">No recommendations waiting</div>
                  <div className="mt-1 text-xs text-[#9a9a9a]">New business signals will appear here.</div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
            <div className="border-b border-[#ededed] px-4 py-3">
              <div className="text-xs font-medium text-[#262626]">System health</div>
              <div className="mt-0.5 text-[11px] text-[#8a8a8a]">Core operating services</div>
            </div>
            <div className="divide-y divide-[#ededed]">
              {systemRows.map((row) => (
                <Link key={row.label} href={row.href} className="block px-4 py-3 transition hover:bg-[#fafafa]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <StatusDot tone={row.tone} />
                      <span className="truncate text-xs font-medium text-[#404040]">{row.label}</span>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[#262626]">{row.value}</span>
                  </div>
                  <div className="mt-1 pl-[18px] text-[11px] text-[#9a9a9a]">{row.detail}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {canManage && (
          <section className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
            <div className="border-b border-[#ededed] px-4 py-3">
              <div className="text-xs font-medium text-[#262626]">Management</div>
              <div className="mt-0.5 text-[11px] text-[#8a8a8a]">Owner and team controls</div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Pending approvals', approvalQ.count ?? 0, '/approvals'],
                ['Active team', teamQ.count ?? 0, '/team'],
                ['Active campaigns', campQ.count ?? 0, '/campaigns'],
                ['Activity today', activityQ.count ?? 0, '/activity'],
              ].map(([label, value, href], index) => (
                <Link key={String(label)} href={String(href)} className={`px-4 py-3.5 transition hover:bg-[#fafafa] ${index > 0 ? 'border-t border-[#ededed] sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'sm:border-l-0 lg:border-l' : ''}`}>
                  <div className="text-[11px] text-[#8a8a8a]">{label}</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-[#262626]">{value}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#e5e5e5] pt-4 text-xs">
          <span className="font-medium text-[#737373]">Quick access</span>
          <Link href="/recurring-work" className="text-[#404040] hover:text-[#1f7a57]">Recurring work</Link>
          <Link href="/sla" className="text-[#404040] hover:text-[#1f7a57]">SLA</Link>
          <Link href="/analytics" className="text-[#404040] hover:text-[#1f7a57]">Analytics</Link>
          <Link href="/automations" className="text-[#404040] hover:text-[#1f7a57]">Automations</Link>
          <Link href="/integrations" className="text-[#404040] hover:text-[#1f7a57]">Integrations</Link>
        </section>
      </div>
    </WorkspaceShell>
  );
}
