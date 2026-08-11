import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import FollowupCompleteButton from '@/components/FollowupCompleteButton';
import { requireUser } from '@/lib/auth';

function naira(value: unknown) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export default async function FollowupSlaPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const org = profile.organization_id;
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [{ data: followupData }, { data: leadData }, { data: peopleData }] = await Promise.all([
    supabase
      .from('lead_followups')
      .select('id,lead_id,assigned_to,due_at,status,channel,notes,created_at')
      .eq('organization_id', org)
      .order('due_at', { ascending: true })
      .limit(200),
    supabase
      .from('leads')
      .select('id,name,phone,email,product_interest,status,estimated_value')
      .eq('organization_id', org)
      .limit(300),
    supabase
      .from('profiles')
      .select('id,full_name')
      .eq('organization_id', org)
      .eq('active', true),
  ]);

  const leads = new Map((leadData ?? []).map((lead: any) => [lead.id, lead]));
  const people = new Map((peopleData ?? []).map((person: any) => [person.id, person]));
  const outstanding = (followupData ?? []).filter(
    (item: any) => !['completed', 'cancelled'].includes(String(item.status || '').toLowerCase())
  );
  const overdue = outstanding.filter((item: any) => item.due_at && new Date(item.due_at) < now);
  const dueSoon = outstanding.filter((item: any) => {
    if (!item.due_at) return false;
    const due = new Date(item.due_at);
    return due >= now && due <= next24h;
  });
  const future = outstanding.filter((item: any) => item.due_at && new Date(item.due_at) > next24h);

  const overdueValue = overdue.reduce((sum: number, item: any) => {
    const lead: any = leads.get(item.lead_id);
    return sum + Number(lead?.estimated_value || 0);
  }, 0);

  return (
    <WorkspaceShell title="Follow-up SLA" subtitle="Never let a warm lead go cold" profile={profile}>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-orange-200 bg-gradient-to-br from-orange-950 via-slate-950 to-rose-950 p-6 text-white shadow-xl sm:p-8">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Follow-up SLA</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Every promised follow-up has a clock</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Overdue and upcoming customer follow-ups are surfaced here so warm leads do not disappear between shifts or branches.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-rose-700">Overdue</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{overdue.length}</div>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-orange-700">Due in 24h</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{dueSoon.length}</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Scheduled later</div>
            <div className="mt-2 text-4xl font-black text-slate-950">{future.length}</div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Value at risk</div>
            <div className="mt-2 text-3xl font-black text-slate-950">{naira(overdueValue)}</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.17em] text-rose-600">Attention queue</div>
              <h2 className="mt-1 text-lg font-black text-slate-950">Outstanding follow-ups</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{outstanding.length}</span>
          </div>

          <div className="mt-5 space-y-3">
            {outstanding.map((item: any) => {
              const lead: any = leads.get(item.lead_id);
              const assignee: any = people.get(item.assigned_to);
              const isOverdue = item.due_at && new Date(item.due_at) < now;
              return (
                <article key={item.id} className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 lg:grid-cols-[1.3fr_.8fr_.8fr_.8fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-black text-slate-950">{lead?.name || lead?.phone || lead?.email || 'Lead follow-up'}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${isOverdue ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {isOverdue ? 'Overdue' : 'Scheduled'}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">{lead?.product_interest || item.notes || 'Customer follow-up'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Assigned</div>
                    <div className="mt-1 text-sm font-bold text-slate-800">{assignee?.full_name || 'Unassigned'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Channel</div>
                    <div className="mt-1 text-sm font-bold capitalize text-slate-800">{item.channel || 'other'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Due</div>
                    <div className={`mt-1 text-sm font-bold ${isOverdue ? 'text-rose-700' : 'text-slate-800'}`}>
                      {item.due_at ? new Date(item.due_at).toLocaleString() : 'No due date'}
                    </div>
                  </div>
                  <FollowupCompleteButton id={item.id} />
                </article>
              );
            })}

            {!outstanding.length && (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-sm font-semibold text-slate-500">
                Follow-up queue is clear.
              </div>
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
