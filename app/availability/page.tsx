import { redirect } from 'next/navigation';
import { requireUser, canManage } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import AvailabilityEditor from '@/components/AvailabilityEditor';

const statusStyles: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700',
  busy: 'bg-orange-50 text-orange-700',
  away: 'bg-amber-50 text-amber-700',
  unavailable: 'bg-rose-50 text-rose-700',
  leave: 'bg-violet-50 text-violet-700',
};

export default async function Page() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const { data: people } = await supabase
    .from('profiles')
    .select('id,full_name,role,department,active,staff_availability(status,note,available_until)')
    .eq('organization_id', profile.organization_id)
    .eq('active', true)
    .order('full_name');

  const availableCount = (people ?? []).filter((person: any) => {
    const availability = person.staff_availability?.[0];
    return !availability || availability.status === 'available';
  }).length;

  return (
    <WorkspaceShell title="Availability" subtitle="Capacity signal" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Planning</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Staff availability</h1>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Available now</div>
            <div className="text-xl font-black text-slate-950">{availableCount}</div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(people ?? []).map((person: any, index: number) => {
            const availability = person.staff_availability?.[0];
            const status = availability?.status || 'available';
            const initials = (person.full_name || 'U')
              .split(' ')
              .map((part: string) => part.charAt(0))
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const gradients = [
              'from-violet-500 to-fuchsia-500',
              'from-cyan-500 to-blue-500',
              'from-emerald-400 to-teal-500',
              'from-orange-400 to-rose-500',
            ];

            return (
              <article key={person.id} className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[index % gradients.length]} text-sm font-black text-white`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-950">{person.full_name}</div>
                      <div className="mt-1 text-xs text-slate-500">{person.role}{person.department ? ` · ${person.department}` : ''}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusStyles[status] || 'bg-slate-100 text-slate-600'}`}>
                    {status}
                  </span>
                </div>

                {availability?.note && <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">{availability.note}</div>}

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <AvailabilityEditor userId={person.id} current={status} canEdit={person.id === user.id || canManage(profile.role)} />
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </WorkspaceShell>
  );
}
