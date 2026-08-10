import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import IntegrationCommandActions from '@/components/IntegrationCommandActions';
import { canManage, requireUser } from '@/lib/auth';

export default async function IntegrationCommandsPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');
  const { data = [] } = await supabase.from('integration_commands')
    .select('*,external_integrations(name,slug)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending:false });
  return <WorkspaceShell title="Integration Commands" subtitle="Request external changes without duplicating source-of-truth ownership" profile={profile}>
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="rounded-3xl border bg-slate-950 p-6 text-white">
        <h1 className="text-2xl font-bold">Boundary-safe command queue</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">WorkflowOS never writes directly into GadgetPoint product, inventory, order or payment tables. It creates an approved command request. The connected admin system pulls the request, performs the change in its own database, then acknowledges the result.</p>
      </div>
      <div className="mt-6 grid gap-4">
        {data.map((row:any)=><article key={row.id} className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{row.command_type}</div><div className="mt-1 text-xs text-slate-500">{row.external_integrations?.name ?? 'Integration'} · {row.target_entity_type ?? 'external entity'} {row.target_entity_id ? `#${row.target_entity_id}`:''}</div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">{String(row.status).replace('_',' ')}</span></div>
          {row.attempt_count>0&&<div className="mt-3 text-xs text-slate-500">Delivery attempts: {row.attempt_count}{row.last_error?` · Last error: ${row.last_error}`:''}</div>}<pre className="mt-4 overflow-auto rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(row.payload ?? {}, null, 2)}</pre>
          <div className="mt-4"><IntegrationCommandActions id={row.id} status={row.status} canManage={canManage(profile.role)}/></div>
        </article>)}
        {!data.length&&<div className="rounded-3xl border border-dashed bg-white p-8 text-sm text-slate-500">No external change requests yet. That is expected until WorkflowOS needs GadgetPoint or another connected system to perform a source-owned action.</div>}
      </div>
    </div>
  </WorkspaceShell>;
}
