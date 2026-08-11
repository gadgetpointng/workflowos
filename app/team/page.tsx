import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import CapabilityManager from '@/components/CapabilityManager';
import WorkspaceShell from '@/components/WorkspaceShell';
import TeamInvite from '@/components/TeamInvite';

const avatarGradients = [
  'from-violet-500 to-fuchsia-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-rose-500',
  'from-pink-500 to-purple-500',
];

export default async function Team() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const [{ data: people }, { data: caps }, { data: links }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,email,role,department,active').eq('organization_id', profile.organization_id).order('full_name'),
    supabase.from('staff_capabilities').select('*').eq('organization_id', profile.organization_id).order('capability'),
    supabase.from('shared_identity_links').select('profile_id,integration_id,external_staff_id,verified_at').eq('organization_id', profile.organization_id),
  ]);

  const byProfile = new Map<string, any[]>();
  for (const cap of caps ?? []) {
    byProfile.set(cap.profile_id, [...(byProfile.get(cap.profile_id) || []), cap]);
  }

  return (
    <WorkspaceShell title="Team" subtitle="People and capabilities" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">People</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Team</h1>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-blue-700">Members</div>
            <div className="text-xl font-black text-slate-950">{people?.length ?? 0}</div>
          </div>
        </section>

        {['owner', 'admin', 'manager'].includes(profile.role) && (
          <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
            <TeamInvite />
          </section>
        )}

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
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
              <article key={person.id} className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradients[index % avatarGradients.length]} text-sm font-black text-white`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-black text-slate-950">{person.full_name || person.email}</h2>
                      <div className="mt-1 text-xs font-medium text-slate-500">
                        {person.role}{person.department ? ` · ${person.department}` : ''}
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">
                    {linked} link{linked === 1 ? '' : 's'}
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
