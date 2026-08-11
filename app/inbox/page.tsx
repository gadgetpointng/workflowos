import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import Link from 'next/link';
import NotificationActions from '@/components/NotificationActions';

export default async function Inbox() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const [{ data: notifications }, { data: conversations }, { data: recommendations }] = await Promise.all([
    supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(60),
    supabase.from('customer_conversations').select('*').eq('organization_id', profile.organization_id).in('status', ['open', 'pending']).order('created_at', { ascending: false }).limit(30),
    supabase.from('growth_recommendations').select('*').eq('organization_id', profile.organization_id).eq('status', 'new').order('score', { ascending: false }).limit(30),
  ]);

  const unread = (notifications ?? []).filter((notification: any) => !notification.read_at).length;

  return (
    <WorkspaceShell title="Inbox" subtitle="Attention center" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-pink-600">Attention center</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Inbox</h1>
          </div>
          <div className="rounded-2xl border border-pink-100 bg-pink-50 px-4 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-pink-700">Unread</div>
            <div className="text-xl font-black text-slate-950">{unread}</div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">Notifications</h2>
              <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">{notifications?.length ?? 0}</span>
            </div>
            <div className="mt-4 space-y-3">
              {(notifications ?? []).map((notification: any) => (
                <article key={notification.id} className={`rounded-2xl border p-4 ${!notification.read_at ? 'border-pink-200 bg-pink-50/50' : 'border-slate-100 bg-white'}`}>
                  <div className="font-black text-slate-950">{notification.title}</div>
                  {notification.body && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{notification.body}</p>}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-400">{new Date(notification.created_at).toLocaleString()}</span>
                    <NotificationActions id={notification.id} read={Boolean(notification.read_at)} />
                  </div>
                </article>
              ))}
              {!notifications?.length && <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/60 p-6 text-sm font-medium text-slate-500">No notifications.</div>}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">Conversations</h2>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">{conversations?.length ?? 0}</span>
            </div>
            <div className="mt-4 space-y-3">
              {(conversations ?? []).map((conversation: any) => (
                <Link href={`/conversations/${conversation.id}`} key={conversation.id} className="block rounded-2xl border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-slate-950">{conversation.customer_name || conversation.customer_phone || 'Customer'}</strong>
                    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">{conversation.channel}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{conversation.last_message || conversation.subject || 'New conversation'}</p>
                  <div className="mt-3 text-[11px] font-black uppercase text-slate-400">{conversation.status}</div>
                </Link>
              ))}
              {!conversations?.length && <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 p-6 text-sm font-medium text-slate-500">No open conversations.</div>}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">Growth alerts</h2>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">{recommendations?.length ?? 0}</span>
            </div>
            <div className="mt-4 space-y-3">
              {(recommendations ?? []).map((recommendation: any, index: number) => {
                const gradients = [
                  'from-violet-500 to-fuchsia-500',
                  'from-cyan-500 to-blue-500',
                  'from-emerald-400 to-teal-500',
                  'from-orange-400 to-rose-500',
                ];
                return (
                  <article key={recommendation.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} text-xs font-black text-white`}>
                        {Number(recommendation.score).toFixed(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-950">{recommendation.title}</div>
                        {recommendation.rationale && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{recommendation.rationale}</p>}
                        <div className="mt-2 text-[10px] font-black uppercase text-violet-600">{recommendation.recommendation_type}</div>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!recommendations?.length && <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-6 text-sm font-medium text-slate-500">No new recommendations.</div>}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
