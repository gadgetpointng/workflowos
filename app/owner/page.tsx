import Link from 'next/link';
import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import OwnerPolicyControls from '@/components/OwnerPolicyControls';
import { requireUser } from '@/lib/auth';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

const ownerActions = [
  {
    title: 'Team communications',
    description: 'Send a team feed, message one staff member privately, track delivery, and retract a sent notification when allowed.',
    href: '/owner-communications',
    cta: 'Open communications',
    icon: '✦',
  },
  {
    title: 'Daily briefing',
    description: 'See overdue work, approvals, hot leads, campaigns and the strongest next moves.',
    href: '/briefing',
    cta: 'Open briefing',
    icon: '☀',
  },
  {
    title: 'Inbox',
    description: 'Review staff conversations and owner messages from one place.',
    href: '/inbox',
    cta: 'Open inbox',
    icon: '◎',
  },
  {
    title: 'Notifications',
    description: 'See urgent alerts, follow-up pressure, approvals and owner communication activity.',
    href: '/notifications',
    cta: 'View alerts',
    icon: '♢',
  },
  {
    title: 'Assign work',
    description: 'Create, review and manage team tasks without leaving WorkflowOS.',
    href: '/tasks',
    cta: 'Manage tasks',
    icon: '✓',
  },
  {
    title: 'Approvals',
    description: 'Review sensitive requests and decisions waiting for management attention.',
    href: '/approvals',
    cta: 'Review approvals',
    icon: '◇',
  },
  {
    title: 'Revenue rescue',
    description: 'Recover high-value open leads before sales conversations go cold.',
    href: '/revenue-rescue',
    cta: 'Rescue revenue',
    icon: '₦',
  },
  {
    title: 'Follow-up SLA',
    description: 'Track overdue and upcoming customer follow-ups and close the loop quickly.',
    href: '/follow-up-sla',
    cta: 'Open follow-ups',
    icon: '⏱',
  },
  {
    title: 'Team Pulse',
    description: 'See staff workload, overdue work, urgent tasks and submitted work at a glance.',
    href: '/team/pulse',
    cta: 'View team pulse',
    icon: '♙',
  },
  {
    title: 'Branch Radar',
    description: 'Compare branch workload, overdue pressure and open sales pipeline.',
    href: '/branch-radar',
    cta: 'Compare branches',
    icon: '⌁',
  },
  {
    title: 'Team',
    description: 'Review active staff, roles and operating coverage.',
    href: '/team',
    cta: 'Open team',
    icon: '♙',
  },
  {
    title: 'GadgetPoint bridge',
    description: 'Check integration health and the connection between WorkflowOS and GadgetPoint.',
    href: '/integrations',
    cta: 'Open integrations',
    icon: '↗',
  },
  {
    title: 'Audit activity',
    description: 'Track policy changes, owner messages, retractions and important workspace actions.',
    href: '/activity',
    cta: 'View audit trail',
    icon: '◌',
  },
  {
    title: 'Settings',
    description: 'Control personal alerts, navigation and workspace preferences.',
    href: '/settings',
    cta: 'Open settings',
    icon: '⚙',
  },
] as const;

export default async function OwnerPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const email = String(profile.email ?? user.email ?? '').trim().toLowerCase();
  if (String(profile.role || '').toLowerCase() !== 'owner' || email !== OWNER_EMAIL) {
    redirect('/dashboard');
  }

  const { data: settings } = await supabase
    .from('organization_settings')
    .select('metadata')
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

  const stored = settings?.metadata?.owner_controls ?? {};
  const initialPolicies = {
    teamFeed: stored.teamFeed !== false,
    privateMessages: stored.privateMessages !== false,
    readReceipts: stored.readReceipts !== false,
    messageRetraction: stored.messageRetraction !== false,
  };

  return (
    <WorkspaceShell title="Owner Control" subtitle="Business controls and owner actions" profile={profile}>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Owner command center</div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Control WorkflowOS from one place</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">Use Yes / No switches for business controls. Use normal action buttons for work such as sending, assigning, approving or retracting a message.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Verified owner</div>
              <div className="mt-1 text-xs font-bold text-slate-900">{OWNER_EMAIL}</div>
            </div>
          </div>
        </section>

        <OwnerPolicyControls initialPolicies={initialPolicies} />

        <section>
          <div className="mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Owner workspaces</div>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">Actions & oversight</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ownerActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">{action.icon}</div>
                  <span className="text-xs font-bold text-blue-700">{action.cta} →</span>
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-950">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
