import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import CommandCenterPulse from '@/components/CommandCenterPulse';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

const quickLinks = [
  ['Today', '/today', '☀'],
  ['Tasks', '/tasks', '✓'],
  ['Opportunities', '/opportunities', '✦'],
  ['Buyer Radar', '/buyers/radar', '◉'],
  ['Leads', '/leads', '◎'],
  ['Campaigns', '/campaigns', '☆'],
  ['Automations', '/automations', '⚡'],
  ['Analytics', '/analytics', '⌁'],
] as const;

const metricStyles = [
  { bar: 'bg-[#2563a9]', soft: 'bg-[#edf3f8]', icon: '✦', note: 'text-[#2563a9]' },
  { bar: 'bg-[#157347]', soft: 'bg-[#edf7f2]', icon: '☆', note: 'text-[#157347]' },
  { bar: 'bg-[#52738f]', soft: 'bg-[#f1f5f8]', icon: '◎', note: 'text-[#52738f]' },
  { bar: 'bg-[#b42318]', soft: 'bg-[#fcecea]', icon: '!', note: 'text-[#b42318]' },
] as const;

function getGreeting() {
  const parts = new Intl.DateTimeFormat('en-NG', { hour: '2-digit', hour12: false, timeZone: 'Africa/Lagos' }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 12);
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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

  const [recQ, campQ, leadQ, taskQ, topQ, approvalQ, teamQ, bridgeQ, activityQ] = await Promise.all([
    supabase.from('growth_recommendations').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'new'),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'active'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org).in('status', ['new', 'contacted', 'interested', 'negotiating']),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('organization_id', org).lt('due_at', now.toISOString()).not('status', 'in', '("completed","approved","cancelled")'),
    supabase.from('growth_recommendations').select('id,title,rationale,score,status').eq('organization_id', org).eq('status', 'new').order('score', { ascending: false }).limit(4),
    canManage ? supabase.from('approvals').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'pending') : Promise.resolve({ count: 0 }),
    canManage ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('active', true) : Promise.resolve({ count: 0 }),
    canManage ? supabase.from('external_integrations').select('id,status,last_synced_at').eq('organization_id', org).eq('slug', 'gadgetpoint').maybeSingle() : Promise.resolve({ data: null }),
    canManage ? supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('organization_id', org).gte('created_at', dayAgo) : Promise.resolve({ count: 0 }),
  ]);

  const metrics = [
    ['Growth signals', String(recQ.count ?? 0), 'New'],
    ['Active campaigns', String(campQ.count ?? 0), 'Live'],
    ['Open leads', String(leadQ.count ?? 0), 'Pipeline'],
    ['Overdue tasks', String(taskQ.count ?? 0), 'Attention'],
  ] as const;

  const bridgeData = bridgeQ.data as { status?: string | null } | null;
  const bridgeStatus = bridgeData
    ? ['active', 'connected'].includes(String(bridgeData.status || '').toLowerCase()) ? 'Connected' : 'Setup'
    : 'Missing';

  const ownerPulse = [
    { label: 'Pending approvals', value: approvalQ.count ?? 0, href: '/approvals', tone: 'orange' as const },
    { label: 'Active team', value: teamQ.count ?? 0, href: '/team', tone: 'emerald' as const },
    { label: 'GadgetPoint bridge', value: bridgeStatus, href: '/integrations', tone: 'cyan' as const },
    { label: 'Activity · 24h', value: activityQ.count ?? 0, href: '/activity', tone: 'violet' as const },
  ];

  const firstName = profile.full_name?.split(' ')[0] || 'there';
  const dateLabel = new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(now);

  return (
    <WorkspaceShell title="Overview" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 border-b border-[#dfe5eb] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#7b8996]">{dateLabel}</div>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.025em] text-[#172b3a] sm:text-[2.15rem]">{getGreeting()}, {firstName}.</h1>
            <p className="mt-2 text-sm text-[#687988]">Your operating position, priorities and next actions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && <Link href="/owner" className="rounded-lg border border-[#102a43] bg-[#102a43] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#173a5e]">Owner Control</Link>}
            <Link href="/today" className="rounded-lg border border-[#ccd5de] bg-white px-4 py-2.5 text-xs font-semibold text-[#405567] shadow-sm transition hover:bg-[#f7f9fb]">Open today</Link>
            <Link href="/tasks" className="rounded-lg border border-[#ccd5de] bg-white px-4 py-2.5 text-xs font-semibold text-[#405567] shadow-sm transition hover:bg-[#f7f9fb]">Assign work</Link>
          </div>
        </section>

        {isOwner && (
          <section className="overflow-hidden rounded-[18px] border border-[#cad7e1] bg-white shadow-sm">
            <div className="grid lg:grid-cols-[1.35fr_.65fr]">
              <div className="border-l-4 border-[#2563a9] p-5 sm:p-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#52738f]">Owner command center</div>
                <h2 className="mt-2 text-xl font-bold tracking-[-0.018em] text-[#172b3a]">Control the team from one place</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6f7f]">Broadcast team instructions, send private staff messages, review communication history and reverse a send when necessary.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/owner" className="rounded-lg bg-[#102a43] px-4 py-2.5 text-xs font-bold text-white">Open Owner Control</Link>
                  <Link href="/inbox" className="rounded-lg border border-[#ccd5de] bg-white px-4 py-2.5 text-xs font-semibold text-[#405567]">View Inbox</Link>
                  <Link href="/activity" className="rounded-lg border border-[#ccd5de] bg-[#f7f9fb] px-4 py-2.5 text-xs font-semibold text-[#405567]">Audit Activity</Link>
                </div>
              </div>
              <div className="border-t border-[#dfe5eb] bg-[#f7f9fb] p-5 lg:border-l lg:border-t-0 sm:p-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#7b8996]">Owner identity</div>
                <div className="mt-3 rounded-xl border border-[#c5e2d3] bg-[#edf7f2] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#155b3a]"><span className="h-2 w-2 rounded-full bg-[#157347]" /> Verified owner</div>
                  <div className="mt-2 break-all text-xs font-semibold text-[#356a50]">{OWNER_EMAIL}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {canManage && <CommandCenterPulse items={ownerPulse} />}

        <section className="overflow-hidden rounded-[16px] border border-[#dfe5eb] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7ecf0] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#157347]" /><span className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#526679]">Operating summary</span></div>
            <Link href="/activity" className="text-xs font-semibold text-[#5f6f7f] transition hover:text-[#172b3a]">View activity →</Link>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, note], index) => {
              const style = metricStyles[index];
              return (
                <div key={label} className="relative border-[#e7ecf0] bg-white p-5 sm:border-r last:border-r-0">
                  <div className={`absolute inset-y-0 left-0 w-[3px] ${style.bar}`} />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#748391]">{label}</div>
                      <div className="mt-3 text-3xl font-bold tabular-nums tracking-[-0.025em] text-[#172b3a]">{value}</div>
                      <div className={`mt-2 text-[10px] font-bold uppercase tracking-[0.07em] ${style.note}`}>{note}</div>
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.soft} text-sm font-bold text-[#35536b]`}>{style.icon}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[16px] border border-[#dfe5eb] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div><div className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#52738f]">Decision queue</div><h2 className="mt-1 text-lg font-bold text-[#172b3a]">Recommended actions</h2></div>
              <Link href="/opportunities" className="text-xs font-semibold text-[#2563a9]">View all →</Link>
            </div>
            <div className="mt-4 space-y-2">
              {(topQ.data ?? []).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[#e2e7ec] bg-[#fafbfc] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#cbd8e3] bg-[#edf3f8] text-xs font-bold tabular-nums text-[#315e82]">{Number(item.score).toFixed(0)}</div>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-[#263b4c]">{item.title}</div>{item.rationale && <div className="mt-0.5 truncate text-xs text-[#748391]">{item.rationale}</div>}</div>
                </div>
              ))}
              {!topQ.data?.length && <div className="rounded-xl border border-dashed border-[#ccd5de] p-6 text-center text-sm font-medium text-[#8492a0]">No new recommendations.</div>}
            </div>
          </div>

          <div className="rounded-[16px] border border-[#dfe5eb] bg-white p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#52738f]">Quick access</div>
            <h2 className="mt-1 text-lg font-bold text-[#172b3a]">Workspace</h2>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {quickLinks.map(([label, href, icon]) => (
                <Link href={href} key={href} className="group flex items-center gap-2.5 rounded-xl border border-[#e2e7ec] bg-[#fafbfc] p-3 transition hover:border-[#c4d0da] hover:bg-white">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#d4dde5] bg-[#edf2f5] text-xs font-bold text-[#405b70]">{icon}</span>
                  <span className="truncate text-xs font-semibold text-[#405567]">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
