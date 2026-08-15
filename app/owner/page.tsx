import Link from 'next/link';
import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import OwnerPolicyControls from '@/components/OwnerPolicyControls';
import { requireUser } from '@/lib/auth';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

const ownerActions = [
  { title: 'Team communications', description: 'Send a team feed, message one staff member privately, track delivery, and retract a sent notification when allowed.', href: '/owner-communications', cta: 'Open communications', icon: '✦' },
  { title: 'Daily briefing', description: 'See overdue work, approvals, hot leads, campaigns and the strongest next moves.', href: '/briefing', cta: 'Open briefing', icon: '☀' },
  { title: 'Inbox', description: 'Review staff conversations and owner messages from one place.', href: '/inbox', cta: 'Open inbox', icon: '◎' },
  { title: 'Notifications', description: 'See urgent alerts, follow-up pressure, approvals and owner communication activity.', href: '/notifications', cta: 'View alerts', icon: '♢' },
  { title: 'Assign work', description: 'Create, review and manage team tasks without leaving WorkflowOS.', href: '/tasks', cta: 'Manage tasks', icon: '✓' },
  { title: 'Approvals', description: 'Review sensitive requests and decisions waiting for management attention.', href: '/approvals', cta: 'Review approvals', icon: '◇' },
  { title: 'Revenue rescue', description: 'Recover high-value open leads before sales conversations go cold.', href: '/revenue-rescue', cta: 'Rescue revenue', icon: '₦' },
  { title: 'Follow-up SLA', description: 'Track overdue and upcoming customer follow-ups and close the loop quickly.', href: '/follow-up-sla', cta: 'Open follow-ups', icon: '⏱' },
  { title: 'Team Pulse', description: 'See staff workload, overdue work, urgent tasks and submitted work at a glance.', href: '/team/pulse', cta: 'View team pulse', icon: '♙' },
  { title: 'Branch Radar', description: 'Compare branch workload, overdue pressure and open sales pipeline.', href: '/branch-radar', cta: 'Compare branches', icon: '⌁' },
  { title: 'Team', description: 'Review active staff, roles and operating coverage.', href: '/team', cta: 'Open team', icon: '♙' },
  { title: 'GadgetPoint bridge', description: 'Check integration health and the connection between WorkflowOS and GadgetPoint.', href: '/integrations', cta: 'Open integrations', icon: '↗' },
  { title: 'Audit activity', description: 'Track policy changes, owner messages, retractions and important workspace actions.', href: '/activity', cta: 'View audit trail', icon: '◌' },
  { title: 'Settings', description: 'Control personal alerts, navigation and workspace preferences.', href: '/settings', cta: 'Open settings', icon: '⚙' },
] as const;

export default async function OwnerPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const email = String(profile.email ?? user.email ?? '').trim().toLowerCase();
  if (String(profile.role || '').toLowerCase() !== 'owner' || email !== OWNER_EMAIL) redirect('/dashboard');

  const org = profile.organization_id;
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [settings, tasks, leads, approvals, products, integrations, failedRuns] = await Promise.all([
    supabase.from('organization_settings').select('metadata').eq('organization_id', org).maybeSingle(),
    supabase.from('tasks').select('id,title,status,priority,due_at,assignee_id').eq('organization_id', org).not('status','in','("completed","approved","cancelled")').order('due_at',{ascending:true}).limit(50),
    supabase.from('leads').select('id,name,source,product_interest,next_followup_at,status').eq('organization_id', org).not('status','in','("purchased","lost")').order('next_followup_at',{ascending:true}).limit(50),
    supabase.from('approvals').select('id,entity_type,status,created_at').eq('organization_id', org).eq('status','pending').order('created_at',{ascending:true}).limit(30),
    supabase.from('connected_products').select('id,name,sku,stock_quantity,last_synced_at').eq('organization_id', org).eq('active', true).limit(500),
    supabase.from('external_integrations').select('id,name,slug,status,last_synced_at').eq('organization_id', org).neq('status','disabled').order('name'),
    supabase.from('automation_runs').select('id,trigger_event,status,error_message,created_at').eq('organization_id', org).eq('status','failed').gte('created_at',dayAgo).order('created_at',{ascending:false}).limit(20),
  ]);

  const stored = settings.data?.metadata?.owner_controls ?? {};
  const initialPolicies = { teamFeed: stored.teamFeed !== false, privateMessages: stored.privateMessages !== false, readReceipts: stored.readReceipts !== false, messageRetraction: stored.messageRetraction !== false };
  const taskRows = tasks.data ?? [];
  const leadRows = leads.data ?? [];
  const productRows = products.data ?? [];
  const integrationRows = integrations.data ?? [];
  const overdueTasks = taskRows.filter((item:any) => item.due_at && new Date(item.due_at) < now);
  const overdueLeads = leadRows.filter((item:any) => item.next_followup_at && new Date(item.next_followup_at) <= now);
  const lowStock = productRows.filter((item:any) => Number(item.stock_quantity) <= 3);
  const unhealthyIntegrations = integrationRows.filter((item:any) => !['connected','active'].includes(String(item.status).toLowerCase()));
  const failedAutomationCount = failedRuns.data?.length ?? 0;

  const attention = [
    overdueTasks.length ? { label: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`, detail: 'Work has passed its due time and needs reassignment, escalation or completion.', href: '/tasks', tone: 'rose' } : null,
    overdueLeads.length ? { label: `${overdueLeads.length} buyer follow-up${overdueLeads.length === 1 ? '' : 's'} due`, detail: 'Customers are waiting for contact. Protect these conversations before they go cold.', href: '/follow-up-sla', tone: 'amber' } : null,
    (approvals.data?.length ?? 0) ? { label: `${approvals.data?.length ?? 0} approval${approvals.data?.length === 1 ? '' : 's'} waiting`, detail: 'Management decisions are blocking downstream work.', href: '/approvals', tone: 'violet' } : null,
    lowStock.length ? { label: `${lowStock.length} low-stock product${lowStock.length === 1 ? '' : 's'}`, detail: 'Review replenishment or branch availability using Admin-backed inventory.', href: '/inventory', tone: 'orange' } : null,
    failedAutomationCount ? { label: `${failedAutomationCount} automation failure${failedAutomationCount === 1 ? '' : 's'} in 24h`, detail: 'An automated workflow could not finish and needs operational review.', href: '/automations', tone: 'rose' } : null,
    unhealthyIntegrations.length ? { label: `${unhealthyIntegrations.length} integration${unhealthyIntegrations.length === 1 ? '' : 's'} needs attention`, detail: 'A connected system is not reporting a healthy active state.', href: '/integrations', tone: 'amber' } : null,
  ].filter(Boolean) as {label:string;detail:string;href:string;tone:string}[];

  const metrics = [
    ['Needs attention', attention.length, '/today'],
    ['Overdue work', overdueTasks.length, '/tasks'],
    ['Buyer follow-ups', overdueLeads.length, '/follow-up-sla'],
    ['Low stock', lowStock.length, '/inventory'],
    ['Approvals', approvals.data?.length ?? 0, '/approvals'],
    ['Automation failures', failedAutomationCount, '/automations'],
  ] as const;

  return (
    <WorkspaceShell title="Owner Control" subtitle="Business controls and owner actions" profile={profile}>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Owner command center</div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Know what needs you before opening another page</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">Live operating pressure from tasks, buyers, approvals, stock, integrations and automations—followed by the controls only the owner should manage.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Verified owner</div>
              <div className="mt-1 text-xs font-bold text-slate-900">{OWNER_EMAIL}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {metrics.map(([label,value,href]) => <Link key={label} href={href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div><div className="mt-2 text-3xl font-black text-slate-950">{value}</div><div className="mt-2 text-xs font-bold text-blue-700">Open →</div></Link>)}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Owner attention</div><h2 className="mt-1 text-xl font-extrabold text-slate-950">What needs action now</h2></div><Link href="/today" className="text-sm font-bold text-blue-700">Open Today →</Link></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {attention.slice(0,6).map((item) => <Link href={item.href} key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"><div className="font-extrabold text-slate-950">{item.label}</div><p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p></Link>)}
            {!attention.length && <div className="col-span-full rounded-xl border border-emerald-200 bg-emerald-50 p-5"><div className="font-extrabold text-emerald-950">No urgent owner exceptions right now.</div><p className="mt-1 text-sm text-emerald-800">WorkflowOS is not seeing overdue work, due follow-ups, pending approvals, low stock, failed automations or unhealthy integrations.</p></div>}
          </div>
        </section>

        <OwnerPolicyControls initialPolicies={initialPolicies} />

        <section>
          <div className="mb-3"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Owner workspaces</div><h2 className="mt-1 text-xl font-extrabold text-slate-950">Actions & oversight</h2></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ownerActions.map((action) => <Link key={action.href} href={action.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">{action.icon}</div><span className="text-xs font-bold text-blue-700">{action.cta} →</span></div><h3 className="mt-4 text-base font-extrabold text-slate-950">{action.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p></Link>)}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
