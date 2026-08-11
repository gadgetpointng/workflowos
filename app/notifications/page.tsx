import Link from 'next/link';
import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import NotificationSoundControls from '@/components/NotificationSoundControls';
import { requireUser } from '@/lib/auth';

type Alert = {
  id: string;
  title: string;
  note: string;
  href: string;
  tone: 'rose' | 'orange' | 'violet' | 'cyan' | 'emerald';
  priority: number;
};

const toneClass = {
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
} as const;

export default async function NotificationsPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const role = String(profile.role || 'member').toLowerCase();
  const canManage = ['owner', 'admin', 'manager'].includes(role);
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const taskQuery = supabase
    .from('tasks')
    .select('id,title,due_at,status,assignee_id,priority')
    .eq('organization_id', org)
    .not('status', 'in', '("completed","approved","cancelled")')
    .order('due_at', { ascending: true })
    .limit(100);

  const followupQuery = supabase
    .from('lead_followups')
    .select('id,lead_id,assigned_to,due_at,status,channel')
    .eq('organization_id', org)
    .not('status', 'in', '("completed","cancelled")')
    .lte('due_at', next24h)
    .order('due_at', { ascending: true })
    .limit(100);

  const [taskQ, followupQ, approvalQ, bridgeQ] = await Promise.all([
    canManage ? taskQuery : taskQuery.eq('assignee_id', user.id),
    canManage ? followupQuery : followupQuery.eq('assigned_to', user.id),
    canManage
      ? supabase.from('approvals').select('id,entity_type,notes,created_at').eq('organization_id', org).eq('status', 'pending').order('created_at', { ascending: true }).limit(50)
      : Promise.resolve({ data: [] as any[] }),
    canManage
      ? supabase.from('external_integrations').select('id,status,last_synced_at').eq('organization_id', org).eq('slug', 'gadgetpoint').maybeSingle()
      : Promise.resolve({ data: null as any }),
  ]);

  const alerts: Alert[] = [];

  for (const task of taskQ.data ?? []) {
    if (!task.due_at) continue;
    const overdue = new Date(task.due_at) < now;
    if (overdue) {
      alerts.push({
        id: `task-${task.id}`,
        title: task.title,
        note: `${task.priority || 'medium'} priority task is overdue`,
        href: '/tasks',
        tone: 'rose',
        priority: task.priority === 'urgent' ? 100 : task.priority === 'high' ? 90 : 75,
      });
    }
  }

  for (const item of followupQ.data ?? []) {
    if (!item.due_at) continue;
    const overdue = new Date(item.due_at) < now;
    alerts.push({
      id: `followup-${item.id}`,
      title: overdue ? 'Customer follow-up overdue' : 'Customer follow-up due soon',
      note: `${String(item.channel || 'follow-up').replaceAll('_', ' ')} · ${new Date(item.due_at).toLocaleString()}`,
      href: '/follow-up-sla',
      tone: overdue ? 'orange' : 'cyan',
      priority: overdue ? 85 : 55,
    });
  }

  for (const approval of approvalQ.data ?? []) {
    alerts.push({
      id: `approval-${approval.id}`,
      title: 'Approval waiting',
      note: `${String(approval.entity_type || 'request').replaceAll('_', ' ')}${approval.notes ? ` · ${approval.notes}` : ''}`,
      href: '/approvals',
      tone: 'violet',
      priority: 80,
    });
  }

  if (canManage) {
    const bridge = bridgeQ.data as any;
    const connected = bridge && ['active', 'connected'].includes(String(bridge.status || '').toLowerCase());
    if (!connected) {
      alerts.push({
        id: 'bridge-status',
        title: 'GadgetPoint connection needs attention',
        note: bridge ? `Bridge status: ${bridge.status || 'setup required'}` : 'No GadgetPoint integration record found.',
        href: '/integrations',
        tone: 'orange',
        priority: 95,
      });
    }
  }

  alerts.sort((a, b) => b.priority - a.priority);
  const urgent = alerts.filter((item) => item.priority >= 85).length;
  const action = alerts.filter((item) => item.priority >= 70).length;

  return (
    <WorkspaceShell title="Notifications" subtitle="Smart attention center" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Attention center</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Only work that needs attention is surfaced here. The list is ranked by urgency instead of notification time.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <NotificationSoundControls />
            <Link href="/settings" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50">Settings →</Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5"><div className="text-[10px] font-black uppercase tracking-wide text-rose-700">Urgent</div><div className="mt-2 text-4xl font-black text-slate-950">{urgent}</div></div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5"><div className="text-[10px] font-black uppercase tracking-wide text-orange-700">Needs action</div><div className="mt-2 text-4xl font-black text-slate-950">{action}</div></div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Total active</div><div className="mt-2 text-4xl font-black text-slate-950">{alerts.length}</div></div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><div className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-600">Ranked queue</div><h2 className="mt-1 text-lg font-black text-slate-950">What deserves attention first</h2></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{alerts.length}</span>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <Link key={alert.id} href={alert.href} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg font-black ${toneClass[alert.tone]}`}>{alert.priority >= 90 ? '!' : alert.priority >= 75 ? '•' : '○'}</div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-black text-slate-950">{alert.title}</div><div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{alert.note}</div></div>
                <span className="text-sm font-black text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600">→</span>
              </Link>
            ))}
            {!alerts.length && <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-center"><div className="text-lg font-black text-emerald-800">All clear</div><div className="mt-1 text-sm font-medium text-slate-500">Nothing needs your attention right now.</div></div>}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
