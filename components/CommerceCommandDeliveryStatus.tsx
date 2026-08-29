import { canManage, requireUser } from '@/lib/auth';
import {
  COMMAND_DISPATCH_RETRY_AFTER_MS,
  COMMAND_DISPATCH_WARNING_ATTEMPT_COUNT,
  COMMAND_DISPATCH_WARNING_STALE_MS,
  isCommandDispatchStale,
  needsCommandDeliveryAttention,
} from '@/lib/integrations/command-dispatch';

function formatAge(value?: string | null) {
  if (!value) return '—';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export default async function CommerceCommandDeliveryStatus() {
  const { supabase, profile } = await requireUser();
  if (!profile || !canManage(profile.role)) return null;

  const { data, error } = await supabase
    .from('integration_commands')
    .select('id,status,attempt_count,dispatched_at,updated_at')
    .eq('organization_id', profile.organization_id)
    .in('status', ['approved', 'dispatched'])
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Could not load commerce command delivery observability', error);
    return (
      <section className="rounded-[28px] border border-amber-200 bg-amber-50/70 p-5 shadow-sm sm:p-6">
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Commerce delivery</div>
        <div className="mt-2 text-base font-black text-slate-900">Delivery telemetry unavailable</div>
        <p className="mt-1 text-xs font-medium text-slate-600">Command delivery continues to use the normal retry contract. No database details are exposed here.</p>
      </section>
    );
  }

  const commands = data ?? [];
  const now = Date.now();
  const ready = commands.filter((command: any) => command.status === 'approved');
  const dispatched = commands.filter((command: any) => command.status === 'dispatched');
  const stale = dispatched.filter((command: any) => isCommandDispatchStale(command.dispatched_at, now));
  const active = dispatched.length - stale.length;
  const highestAttempt = commands.reduce((max: number, command: any) => Math.max(max, Number(command.attempt_count ?? 0)), 0);
  const oldestStale = stale
    .map((command: any) => command.dispatched_at)
    .filter(Boolean)
    .sort((a: string, b: string) => String(a).localeCompare(String(b)))[0] ?? null;
  const retryMinutes = COMMAND_DISPATCH_RETRY_AFTER_MS / 60000;
  const warningStaleMinutes = COMMAND_DISPATCH_WARNING_STALE_MS / 60000;
  const needsAttention = commands.some((command: any) =>
    needsCommandDeliveryAttention(Number(command.attempt_count ?? 0), command.dispatched_at, now),
  );

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#214e78]">Commerce delivery</div>
          <h2 className="mt-1 text-lg font-black text-[#102a43]">Command dispatch health</h2>
          <p className="mt-1 max-w-2xl text-xs font-medium text-slate-500">
            Read-only delivery telemetry for this workspace. Stale commands become eligible for safe re-dispatch after {retryMinutes} minutes.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${needsAttention ? 'bg-rose-50 text-rose-700' : stale.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {needsAttention ? 'Needs attention' : stale.length > 0 ? `${stale.length} retrying` : 'Healthy'}
        </span>
      </div>

      {needsAttention ? (
        <div className="border-b border-rose-100 bg-rose-50/70 px-5 py-3 text-xs font-semibold text-rose-800 sm:px-6">
          Delivery has crossed the manager warning threshold: at least {COMMAND_DISPATCH_WARNING_ATTEMPT_COUNT} attempts or a dispatch age over {warningStaleMinutes} minutes. Recovery remains automatic; no retry cap or command mutation is applied here.
        </div>
      ) : null}

      <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Ready', String(ready.length), 'Approved and waiting for delivery'],
          ['In flight', String(active), 'Inside the active dispatch lease'],
          ['Stale / retryable', String(stale.length), oldestStale ? `Oldest stale lease ${formatAge(oldestStale)} ago` : 'No stale dispatch leases'],
          ['Highest attempt', String(highestAttempt), 'Observed delivery attempts in current queue'],
        ].map(([label, value, note]) => (
          <div key={label} className="bg-white p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
            <div className="mt-2 text-lg font-black tabular-nums text-[#102a43]">{value}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">{note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
