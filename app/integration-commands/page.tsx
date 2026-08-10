import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import IntegrationCommandActions from '@/components/IntegrationCommandActions';
import { canManage, requireUser } from '@/lib/auth';

export default async function IntegrationCommandsPage() {
  const { supabase, user, profile } = await requireUser();

  if (!user || !profile) {
    redirect('/login');
  }

  const { data } = await supabase
    .from('integration_commands')
    .select('*,external_integrations(name,slug)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false });

  const commands = data ?? [];
  const userCanManage = canManage(profile.role);

  return (
    <WorkspaceShell
      title="Integration Commands"
      subtitle="Boundary-safe external change requests"
      profile={profile}
    >
      <div className="space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">
            Boundary-safe command queue
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            WorkflowOS never writes directly into GadgetPoint product,
            inventory, order or payment tables. It creates an approved
            command request. The connected admin system pulls the request,
            performs the change in its own database, then acknowledges the
            result.
          </p>
        </section>

        <div className="space-y-4">
          {commands.map((row: any) => (
            <div
              key={row.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {row.command_type}
                  </div>

                  <div className="text-sm text-slate-500">
                    {row.external_integrations?.name ?? 'Integration'}
                    {' · '}
                    {row.target_entity_type ?? 'external entity'}
                    {row.target_entity_id
                      ? ` #${row.target_entity_id}`
                      : ''}
                  </div>
                </div>

                <div className="text-sm capitalize">
                  {String(row.status ?? '').replaceAll('_', ' ')}
                </div>
              </div>

              {row.attempt_count > 0 && (
                <div className="mt-3 text-sm text-slate-600">
                  Delivery attempts: {row.attempt_count}
                  {row.last_error
                    ? ` · Last error: ${row.last_error}`
                    : ''}
                </div>
              )}

              <pre className="mt-4 overflow-x-auto rounded bg-slate-50 p-3 text-xs">
                {JSON.stringify(row.payload ?? {}, null, 2)}
              </pre>

              <div className="mt-4">
                <IntegrationCommandActions
                  id={row.id}
                  status={row.status}
                  canManage={userCanManage}
                />
              </div>
            </div>
          ))}

          {commands.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-white p-6">
              <p className="text-sm text-slate-500">
                No external change requests yet. That is expected until
                WorkflowOS needs GadgetPoint or another connected system to
                perform a source-owned action.
              </p>
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
