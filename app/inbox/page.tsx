import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import Link from 'next/link';
import NotificationActions from '@/components/NotificationActions';

function scoreStyle(score: number) {
  if (score >= 80) return 'border-[#c5e2d3] bg-[#edf7f2] text-[#157347]';
  if (score >= 60) return 'border-[#cbd8e3] bg-[#edf3f8] text-[#315e82]';
  return 'border-[#ead9a9] bg-[#fff5dc] text-[#946200]';
}

export default async function Inbox() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const [{ data: notifications }, { data: conversations }, { data: recommendations }] = await Promise.all([
    supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(60),
    supabase.from('customer_conversations').select('*').eq('organization_id', profile.organization_id).in('status', ['open', 'pending']).order('created_at', { ascending: false }).limit(30),
    supabase.from('growth_recommendations').select('*').eq('organization_id', profile.organization_id).eq('status', 'new').order('score', { ascending: false }).limit(30),
  ]);

  const allNotifications = notifications ?? [];
  const unread = allNotifications.filter((notification: any) => !notification.read_at).length;
  const ownerMessages = allNotifications.filter((notification: any) => ['owner_feed', 'owner_private_message'].includes(String(notification.type || '')));
  const ownerUnread = ownerMessages.filter((notification: any) => !notification.read_at).length;
  const otherNotifications = allNotifications.filter((notification: any) => !['owner_feed', 'owner_private_message'].includes(String(notification.type || '')));

  return (
    <WorkspaceShell title="Inbox" subtitle="Attention center" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe5eb] pb-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#52738f]">Attention center</div>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.025em] text-[#172b3a]">Inbox</h1>
            <p className="mt-2 text-sm text-[#687988]">Owner instructions, system alerts, customer conversations and commercial signals.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-[#cbd8e3] bg-[#edf3f8] px-4 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.09em] text-[#52738f]">Owner unread</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-[#172b3a]">{ownerUnread}</div>
            </div>
            <div className="rounded-xl border border-[#d7e0e8] bg-white px-4 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.09em] text-[#687988]">All unread</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-[#172b3a]">{unread}</div>
            </div>
          </div>
        </section>

        {ownerMessages.length > 0 && (
          <section className="overflow-hidden rounded-[16px] border border-[#cbd8e3] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dde6ed] bg-[#f3f7fa] px-5 py-4 sm:px-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#315e82]">From owner</div>
                <h2 className="mt-1 text-lg font-bold text-[#172b3a]">Priority messages</h2>
                <p className="mt-1 text-sm text-[#687988]">Direct instructions and team feeds from the owner.</p>
              </div>
              <span className="rounded-full border border-[#cbd8e3] bg-white px-3 py-1.5 text-xs font-bold tabular-nums text-[#315e82]">{ownerMessages.length}</span>
            </div>

            <div className="grid gap-3 p-5 sm:p-6 lg:grid-cols-2">
              {ownerMessages.slice(0, 8).map((notification: any) => {
                const isPrivate = notification.type === 'owner_private_message';
                return (
                  <article key={notification.id} className={`rounded-xl border p-4 ${!notification.read_at ? 'border-[#9fb9cf] bg-[#fbfdff]' : 'border-[#e0e6eb] bg-white'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.05em] ${isPrivate ? 'border-[#cbd8e3] bg-[#edf3f8] text-[#315e82]' : 'border-[#d7e0e8] bg-[#f2f6f9] text-[#53697c]'}`}>{isPrivate ? 'Private from owner' : 'Owner feed'}</span>
                      {!notification.read_at && <span className="h-2 w-2 rounded-full bg-[#b42318]" aria-label="Unread" />}
                    </div>
                    <div className="mt-2 text-base font-semibold text-[#263b4c]">{notification.title}</div>
                    {notification.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f6f7f]">{notification.body}</p>}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#edf0f3] pt-3">
                      <span className="text-[11px] font-medium tabular-nums text-[#8492a0]">{new Date(notification.created_at).toLocaleString()}</span>
                      <NotificationActions id={notification.id} read={Boolean(notification.read_at)} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-3">
          <div className="rounded-[16px] border border-[#dfe5eb] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0f3] pb-3">
              <h2 className="text-base font-bold text-[#172b3a]">System notifications</h2>
              <span className="rounded-full border border-[#d7e0e8] bg-[#f7f9fb] px-3 py-1 text-xs font-bold tabular-nums text-[#5f6f7f]">{otherNotifications.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {otherNotifications.map((notification: any) => (
                <article key={notification.id} className={`rounded-xl border p-4 ${!notification.read_at ? 'border-[#cbd8e3] bg-[#f7fafc]' : 'border-[#e2e7ec] bg-white'}`}>
                  <div className="font-semibold text-[#263b4c]">{notification.title}</div>
                  {notification.body && <p className="mt-2 line-clamp-2 text-sm text-[#687988]">{notification.body}</p>}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium tabular-nums text-[#8492a0]">{new Date(notification.created_at).toLocaleString()}</span>
                    <NotificationActions id={notification.id} read={Boolean(notification.read_at)} />
                  </div>
                </article>
              ))}
              {!otherNotifications.length && <div className="rounded-xl border border-dashed border-[#ccd5de] bg-[#fafbfc] p-6 text-sm font-medium text-[#8492a0]">No other notifications.</div>}
            </div>
          </div>

          <div className="rounded-[16px] border border-[#dfe5eb] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0f3] pb-3">
              <h2 className="text-base font-bold text-[#172b3a]">Conversations</h2>
              <span className="rounded-full border border-[#d7e0e8] bg-[#f7f9fb] px-3 py-1 text-xs font-bold tabular-nums text-[#5f6f7f]">{conversations?.length ?? 0}</span>
            </div>
            <div className="mt-4 space-y-3">
              {(conversations ?? []).map((conversation: any) => (
                <Link href={`/conversations/${conversation.id}`} key={conversation.id} className="block rounded-xl border border-[#e2e7ec] bg-white p-4 transition hover:border-[#c6d0d9] hover:bg-[#fafbfc]">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="font-semibold text-[#263b4c]">{conversation.customer_name || conversation.customer_phone || 'Customer'}</strong>
                    <span className="rounded-full border border-[#cbd8e3] bg-[#edf3f8] px-2.5 py-1 text-[9px] font-bold text-[#315e82]">{conversation.channel}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[#687988]">{conversation.last_message || conversation.subject || 'New conversation'}</p>
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.05em] text-[#8492a0]">{conversation.status}</div>
                </Link>
              ))}
              {!conversations?.length && <div className="rounded-xl border border-dashed border-[#ccd5de] bg-[#fafbfc] p-6 text-sm font-medium text-[#8492a0]">No open conversations.</div>}
            </div>
          </div>

          <div className="rounded-[16px] border border-[#dfe5eb] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0f3] pb-3">
              <h2 className="text-base font-bold text-[#172b3a]">Growth alerts</h2>
              <span className="rounded-full border border-[#d7e0e8] bg-[#f7f9fb] px-3 py-1 text-xs font-bold tabular-nums text-[#5f6f7f]">{recommendations?.length ?? 0}</span>
            </div>
            <div className="mt-4 space-y-3">
              {(recommendations ?? []).map((recommendation: any) => {
                const score = Number(recommendation.score || 0);
                return (
                  <article key={recommendation.id} className="rounded-xl border border-[#e2e7ec] bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-bold tabular-nums ${scoreStyle(score)}`}>{score.toFixed(0)}</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#263b4c]">{recommendation.title}</div>
                        {recommendation.rationale && <p className="mt-1 line-clamp-2 text-sm text-[#687988]">{recommendation.rationale}</p>}
                        <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.05em] text-[#52738f]">{recommendation.recommendation_type}</div>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!recommendations?.length && <div className="rounded-xl border border-dashed border-[#ccd5de] bg-[#fafbfc] p-6 text-sm font-medium text-[#8492a0]">No new recommendations.</div>}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
