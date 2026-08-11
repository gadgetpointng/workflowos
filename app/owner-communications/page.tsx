import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import OwnerCommunicationsPanel from '@/components/OwnerCommunicationsPanel';
import { requireUser } from '@/lib/auth';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

export default async function OwnerCommunicationsPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const email = String(profile.email ?? user.email ?? '').trim().toLowerCase();
  if (profile.role !== 'owner' || email !== OWNER_EMAIL) redirect('/dashboard');

  const [{ data: staff }, { data: actions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,full_name,email,role,department,active')
      .eq('organization_id', profile.organization_id)
      .eq('active', true)
      .neq('id', user.id)
      .order('full_name', { ascending: true }),
    supabase
      .from('activity_logs')
      .select('id,created_at,metadata')
      .eq('organization_id', profile.organization_id)
      .eq('actor_id', user.id)
      .eq('action', 'owner.communication.sent')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return (
    <WorkspaceShell title="Owner Communications" subtitle="Broadcast, private messaging and reversible owner sends" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Owner command center</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Communications</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Send a feed to all active staff or a private message to one staff member. Staff receive it through WorkflowOS notifications, and owner sends can be retracted from the audit trail.</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Active recipients</div>
            <div className="text-xl font-black text-slate-950">{staff?.length ?? 0}</div>
          </div>
        </section>

        <OwnerCommunicationsPanel staff={staff ?? []} actions={actions ?? []} />
      </div>
    </WorkspaceShell>
  );
}
