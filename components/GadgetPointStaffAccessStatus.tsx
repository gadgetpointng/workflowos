type StaffRecord = {
  id?: string;
  external_staff_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  department?: string | null;
  status?: string | null;
  profile_id?: string | null;
  metadata?: Record<string, unknown> | null;
  last_synced_at?: string | null;
  updated_at?: string | null;
};

const ACCESS_ADMIN_URL = 'https://gadgetpoint.ng/admin/workflowos-access';
const STAFF_LOGIN_URL = 'https://gadgetpoint.ng/staff-login';

function bool(value: unknown) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function scopes(staff: StaffRecord) {
  const metadata = staff.metadata ?? {};
  const direct = metadata.workflowos_permissions;
  const nested = typeof metadata.workflowos === 'object' && metadata.workflowos
    ? (metadata.workflowos as Record<string, unknown>).scopes
    : null;
  const value = Array.isArray(direct) ? direct : Array.isArray(nested) ? nested : [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function enabled(staff: StaffRecord) {
  const metadata = staff.metadata ?? {};
  const nested = typeof metadata.workflowos === 'object' && metadata.workflowos
    ? (metadata.workflowos as Record<string, unknown>).enabled
    : null;
  return bool(metadata.workflowos_access_enabled) || bool(nested);
}

function username(staff: StaffRecord) {
  return String(staff.metadata?.username ?? '').trim();
}

function formatDate(value?: string | null) {
  if (!value) return 'No sync yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No sync yet';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function GadgetPointStaffAccessStatus({ staff, owner }: { staff: StaffRecord[]; owner: boolean }) {
  const active = staff.filter((item) => item.status === 'active');
  const enabledStaff = active.filter(enabled);
  const linked = active.filter((item) => Boolean(item.profile_id));
  const needsSetup = active.filter((item) => !enabled(item));

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#214e78]">GadgetPoint identity handoff</div>
          <h2 className="mt-1 text-xl font-black text-[#102a43]">Staff WorkflowOS access</h2>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Read-only status from GadgetPoint. The owner still enables staff and chooses their WorkflowOS work areas inside GadgetPoint Admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={STAFF_LOGIN_URL} target="_blank" rel="noreferrer" className="ios-action secondary-button inline-flex min-h-[42px] items-center justify-center rounded-[13px] px-4 text-sm font-bold">
            Open staff login
          </a>
          {owner ? (
            <a href={ACCESS_ADMIN_URL} target="_blank" rel="noreferrer" className="ios-action primary-button inline-flex min-h-[42px] items-center justify-center rounded-[13px] px-4 text-sm font-bold">
              Manage access in GadgetPoint
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Active staff', String(active.length), 'Synced from GadgetPoint'],
          ['WorkflowOS enabled', String(enabledStaff.length), 'Owner-approved access'],
          ['Session linked', String(linked.length), 'WorkflowOS profile connected'],
          ['Needs setup', String(needsSetup.length), 'Access not enabled in GadgetPoint'],
        ].map(([label, value, note]) => (
          <div key={label} className="bg-white p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
            <div className="mt-2 text-2xl font-black tabular-nums text-[#102a43]">{value}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">{note}</div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 p-5 sm:p-6">
        {active.length ? (
          <div className="grid gap-3">
            {active.map((person) => {
              const isEnabled = enabled(person);
              const permissionScopes = scopes(person);
              const handle = username(person) || person.email || person.external_staff_id || 'staff';
              return (
                <article key={person.external_staff_id || person.id || handle} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-slate-900">{person.full_name || handle}</div>
                      <div className="mt-1 break-all text-xs font-medium text-slate-500">
                        @{handle} · {person.role || 'staff'}{person.department ? ` · ${person.department}` : ''}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {isEnabled ? 'WorkflowOS enabled' : 'Needs owner setup'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {permissionScopes.length ? permissionScopes.map((scope) => (
                      <span key={scope} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-[#214e78]">{scope}</span>
                    )) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">No WorkflowOS work areas selected</span>
                    )}
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${person.profile_id ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                      {person.profile_id ? 'Profile linked' : 'Profile opens after first successful handoff'}
                    </span>
                  </div>

                  <div className="mt-3 text-[11px] font-semibold text-slate-400">Last staff sync: {formatDate(person.last_synced_at || person.updated_at)}</div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-medium text-slate-500">No active GadgetPoint staff are mirrored yet.</div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs font-medium leading-5 text-slate-600 sm:px-6">
        <strong className="text-slate-900">Identity boundary:</strong> staff passwords never move into WorkflowOS. GadgetPoint sends only the verified staff identity, role, branch and owner-approved work scopes through a short-lived one-time handoff.
      </div>
    </section>
  );
}
