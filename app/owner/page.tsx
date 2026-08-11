import Link from 'next/link';
import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import { requireUser } from '@/lib/auth';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

const ownerActions = [
  {
    title: 'Team communications',
    description: 'Send a feed to all staff, message one person privately, and undo recent sends.',
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
    description: 'Track owner sends, reversals and important workspace actions.',
    href: '/activity',
    cta: 'View audit trail',
    icon: '◌',
  },
  {
    title: 'Settings',
    description: 'Control sound alerts, desktop notifications, smart navigation and workspace preferences.',
    href: '/settings',
    cta: 'Open settings',
    icon: '⚙',
  },
] as const;

export default async function OwnerPage() {
  const { user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const email = String(profile.email ?? user.email ?? '').trim().toLowerCase();
  if (String(profile.role || '').toLowerCase() !== 'owner' || email !== OWNER_EMAIL) {
    redirect('/dashboard');
  }

  return (
    <WorkspaceShell title="Owner Control" subtitle="Direct access to owner actions" profile={profile}>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-violet-100 bg-gradient-to-br from-violet-950 via-slate-950 to-cyan-950 p-6 text-white shadow-xl sm:p-8">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Owner command center</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Run WorkflowOS from one control surface</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Every control below opens a live WorkflowOS workspace. Communications remains reversible through the owner audit trail.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/owner-communications" className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-50">
              Send team message
            </Link>
            <Link href="/briefing" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/15">
              Daily briefing
            </Link>
            <Link href="/notifications" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-black text-white transition hover:bg-white/15">
              Open notifications
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ownerActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                  {action.icon}
                </div>
                <span className="text-xs font-black text-cyan-700 transition group-hover:translate-x-0.5">{action.cta} →</span>
              </div>
              <h2 className="mt-5 text-lg font-black text-slate-950">{action.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
            </Link>
          ))}
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Verified owner session</div>
            <div className="mt-1 text-sm font-black text-slate-950">{OWNER_EMAIL}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/activity" className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-100">
              Audit activity
            </Link>
            <Link href="/settings" className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-100">
              Open settings
            </Link>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
