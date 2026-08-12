import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { WORKFLOWOS_OWNER_EMAIL } from '@/lib/auth/staff-credentials';

export default async function StaffAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const { data: session } = await supabase.auth.getUser();
  const user = session.user;

  if (!user) {
    redirect('/login?message=' + encodeURIComponent('Sign in as the WorkflowOS owner to manage staff access.'));
  }

  const admin = createAdminClient();
  const { data: owner } = await admin
    .from('profiles')
    .select('id,organization_id,email,role,active')
    .eq('id', user.id)
    .maybeSingle();

  if (
    !owner ||
    owner.active === false ||
    String(owner.role ?? '').toLowerCase() !== 'owner' ||
    String(owner.email ?? '').trim().toLowerCase() !== WORKFLOWOS_OWNER_EMAIL ||
    String(user.email ?? '').trim().toLowerCase() !== WORKFLOWOS_OWNER_EMAIL
  ) {
    redirect('/dashboard');
  }

  const { data: integration } = await admin
    .from('external_integrations')
    .select('id')
    .eq('organization_id', owner.organization_id)
    .eq('slug', 'gadgetpoint')
    .maybeSingle();

  const { data: staff } = integration
    ? await admin
        .from('connected_staff')
        .select('id,external_staff_id,full_name,role,department,status,updated_at,metadata')
        .eq('integration_id', integration.id)
        .order('full_name', { ascending: true })
    : { data: [] as any[] };

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-[#172b3a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Owner control</div>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.03em] text-[#102a43]">Staff access</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Create or reset a WorkflowOS staff login using the same username and password you want to hand to that staff member.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm">Dashboard</Link>
            <Link href="/login" className="rounded-xl bg-[#102a43] px-4 py-2.5 text-sm font-black text-white">Test login</Link>
          </div>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
        {message && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Create or reset login</div>
            <h2 className="mt-2 text-xl font-black text-slate-950">Staff credentials</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">Passwords are handled by WorkflowOS authentication and are never shown in the staff directory.</p>

            <form action="/api/admin/staff-access" method="post" className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-black text-slate-700">Username</span>
                <input name="username" required minLength={3} maxLength={48} autoComplete="off" className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500" placeholder="e.g. chinedu" />
              </label>
              <label className="block">
                <span className="text-xs font-black text-slate-700">Password</span>
                <input name="password" type="password" required minLength={8} autoComplete="new-password" className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500" placeholder="At least 8 characters" />
              </label>
              <label className="block">
                <span className="text-xs font-black text-slate-700">Full name</span>
                <input name="full_name" className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500" placeholder="Staff full name" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black text-slate-700">Role</span>
                  <select name="role" defaultValue="staff" className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500">
                    <option value="staff">Staff</option>
                    <option value="sales">Sales</option>
                    <option value="marketing">Marketing</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-black text-slate-700">Department</span>
                  <input name="department" className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500" placeholder="Sales, Store, etc." />
                </label>
              </div>
              <button type="submit" className="min-h-[48px] w-full rounded-xl bg-[#102a43] px-4 text-sm font-black text-white shadow-sm">Save staff access</button>
            </form>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Current access</div>
                <h2 className="mt-2 text-xl font-black text-slate-950">Staff directory</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{staff?.length ?? 0} staff</span>
            </div>

            <div className="mt-5 space-y-3">
              {!staff?.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No direct staff logins yet. Create the first one using the form.</div>
              )}
              {staff?.map((member: any) => {
                const username = String(member.metadata?.username ?? member.external_staff_id ?? 'staff');
                return (
                  <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-950">{member.full_name || username}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">@{username} · {member.role}{member.department ? ` · ${member.department}` : ''}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${member.status === 'inactive' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{member.status || 'active'}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-xs leading-5 text-amber-900">
          <strong>Temporary bridge:</strong> until the live GadgetPoint Admin deployment is under our control, create the staff here with the same username and password you give them in GadgetPoint. They can then use those exact credentials at workflow.gadgetpoint.ng.
        </div>
      </div>
    </main>
  );
}
