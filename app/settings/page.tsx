import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import WorkspacePreferences from '@/components/WorkspacePreferences';

const cards = [
  ['Organization', 'from-violet-500 to-fuchsia-500'],
  ['Default currency', 'from-cyan-500 to-blue-500'],
  ['Timezone', 'from-emerald-400 to-teal-500'],
  ['Web app mode', 'from-orange-400 to-rose-500'],
] as const;

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const [{ data: org }, { data: settings }, { data: bridge }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', profile.organization_id).single(),
    supabase.from('organization_settings').select('*').eq('organization_id', profile.organization_id).maybeSingle(),
    supabase.from('external_integrations').select('id,status,last_synced_at').eq('organization_id', profile.organization_id).eq('slug', 'gadgetpoint').maybeSingle(),
  ]);

  const values = [
    [org?.name || 'Workspace', org?.slug || ''],
    [settings?.default_currency || 'NGN', 'Reporting and commerce'],
    [settings?.timezone || 'Africa/Lagos', 'Deadlines and SLA'],
    ['PWA enabled', 'Responsive app experience'],
  ] as const;

  const bridgeConnected = bridge && ['active', 'connected'].includes(String(bridge.status || '').toLowerCase());

  return (
    <WorkspaceShell title="Settings" subtitle="Workspace configuration" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Configuration</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Control how WorkflowOS behaves, how it alerts you, and how your connected workspace is configured.</p>
          </div>
          <Link href="/notifications" className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-800">Notifications →</Link>
        </section>

        <WorkspacePreferences />

        <section className="grid gap-4 md:grid-cols-2">
          {cards.map(([label, gradient], index) => (
            <div key={label} className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${gradient}`} />
              <div className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
              <div className="mt-1 text-xl font-black text-slate-950">{values[index][0]}</div>
              {values[index][1] && <div className="mt-1 text-sm font-medium text-slate-500">{values[index][1]}</div>}
            </div>
          ))}
        </section>

        <section className="relative overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-xl">
          <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-violet-500/35 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Connected business</div>
              <h2 className="mt-2 text-xl font-black">Independent systems. Shared operations.</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-cyan-400/15 px-3 py-1.5 text-xs font-bold text-cyan-100 ring-1 ring-cyan-400/20">GadgetPoint</span>
                <span className="rounded-full bg-violet-400/15 px-3 py-1.5 text-xs font-bold text-violet-100 ring-1 ring-violet-400/20">WorkflowOS</span>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-400/20">Storefront</span>
              </div>
            </div>
            <Link href="/integrations" className={`rounded-2xl px-4 py-3 text-xs font-black ring-1 ${bridgeConnected ? 'bg-emerald-400/15 text-emerald-100 ring-emerald-300/20' : 'bg-orange-400/15 text-orange-100 ring-orange-300/20'}`}>
              GadgetPoint bridge · {bridgeConnected ? 'Connected' : 'Needs attention'} →
            </Link>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
