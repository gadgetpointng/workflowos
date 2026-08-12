import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { WORKFLOWOS_OWNER_EMAIL } from '@/lib/auth/staff-credentials';
import CapabilityManager from '@/components/CapabilityManager';
import WorkspaceShell from '@/components/WorkspaceShell';

const avatarGradients = [
  'from-violet-500 to-fuchsia-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-rose-500',
  'from-pink-500 to-purple-500',
];

export default async function Team({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const role = String(profile.role ?? '').toLowerCase();
  const email = String(profile.email ?? user.email ?? '').trim().toLowerCase();
  const isOwner = role === 'owner' && email === WORKFLOWOS_OWNER_EMAIL;

  const [{ data: people }, { data: caps }, { data: links }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,full_name,email,role,department,active')
      .eq('organization_id', profile.organization_id)
      .order('full_name'),
    supabase
      .from('staff_capabilities')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('capability'),
    supabase
      .from('shared_identity_links')
      .select('profile_id,integration_id,external_staff_id,verified_at')
      .eq('organization_id', profile.organization_id),
  ]);

  const byProfile = new Map<string, any[]>();
  for (const cap of caps ?? []) {
    byProfile.set(cap.profile_id, [...(byProfile.get(cap.profile_id) || []), cap]);
  }

  return (
    <WorkspaceShell title="Team" subtitle="People, access and capabilities" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">People</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Team</h1>
            <p className="mt-2 text-sm text-slate-600">Create staff access, manage people and assign capabilities from one place.</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-blue-700">Members</div>
            <div className="text-xl font-black text-slate-950">{people?.length ?? 0}</div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {isOwner ? (
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Owner access</div>
                <h2 className="mt-2 text-xl font-black text-slate-950">Add or reset staff login</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Create the username and password once here. WorkflowOS stores the password securely through authentication; it is never displayed in the staff directory.
                </p>
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">
                  Owner verified as <strong>{WORKFLOWOS_OWNER_EMAIL}</strong>.
                </div>
              </div>

              <form action="/api/admin/staff-access" method="post" className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="return_to" value="/team" />
                <label className="block">
                  <span className="text-xs font-black text-slate-700">Username</span>
                  <input
                    name="username"
                    required
                    minLength={3}
                    maxLength={48}
                    autoComplete="off"
                    className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500"
                    placeholder="e.g. chinedu"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-slate-700">Password</span>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500"
                    placeholder="At least 8 characters"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-slate-700">Full name</span>
                  <input
                    name="full_name"
                    className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500"
                    placeholder="Staff full name"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-slate-700">Department</span>
                  <input
                    name="department"
                    className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500"
                    placeholder="Sales, Store, etc."
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-slate-700">Role</span>
                  <select
                    name="role"
                    defaultValue="staff"
                    className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="staff">Staff</option>
                    <option value="sales">Sales</option>
                    <option value="marketing">Marketing</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="min-h-[46px] w-full rounded-xl bg-[#102a43] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#173a5e]"
                  >
                    Save staff access
                  </button>
                </div>
              </form>
            </div>
          </section>
        ) : (
          <section className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            Staff login creation is restricted to the authorized WorkflowOS owner.
          </section>
        )}

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Capabilities</div>
            <h2 className="mt-1 text-lg font-black text-slate-950">Assign staff capabilities</h2>
          </div>
          <CapabilityManager people={(people ?? []) as any} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {(people ?? []).map((person: any, index: number) => {
            const personCaps = byProfile.get(person.id) || [];
            const linked = (links ?? []).filter((link: any) => link.profile_id === person.id).length;
            const initials = (person.full_name || person.email || 'U')
              .split(' ')
              .map((part: string) => part.charAt(0))
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <article
                key={person.id}
                className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradients[index % avatarGradients.length]} text-sm font-black text-white`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-black text-slate-950">{person.full_name || person.email}</h2>
                      <div className="mt-1 text-xs font-medium text-slate-500">
                        {person.role}{person.department ? ` · ${person.department}` : ''}
                      </div>
                    </div>
                  </div>

                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${person.active === false ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {person.active === false ? 'Inactive' : linked ? `${linked} linked` : 'Active'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {personCaps.length ? (
                    personCaps.map((cap: any) => (
                      <span key={cap.id} className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                        {cap.capability} · {cap.proficiency}/5
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No capabilities assigned.</span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </WorkspaceShell>
  );
}
