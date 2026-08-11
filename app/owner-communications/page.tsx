import { redirect } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import OwnerCommunicationsPanel from '@/components/OwnerCommunicationsPanel';
import { requireUser } from '@/lib/auth';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

type OwnerAction = {
  id: string;
  created_at: string;
  metadata?: {
    mode?: string;
    title?: string;
    message?: string;
    recipient_ids?: string[];
    recipient_names?: string[];
    notification_ids?: string[];
  } | null;
};

export default async function OwnerCommunicationsPage() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');

  const email = String(profile.email ?? user.email ?? '').trim().toLowerCase();
  if (profile.role !== 'owner' || email !== OWNER_EMAIL) redirect('/dashboard');

  const [{ data: staff }, { data: actionsRaw }, { data: retractions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,full_name,email,role,department,active')
      .eq('organization_id', profile.organization_id)
      .eq('active', true)
      .neq('id', user.id)
      .order('full_name', { ascending: true }),
    supabase
      .from('activity_logs')
      .select('id,created_at,metadata')
      .eq('organization_id', profile.organization_id)
      .eq('actor_id', user.id)
      .eq('action', 'owner.communication.sent')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('activity_logs')
      .select('id,metadata')
      .eq('organization_id', profile.organization_id)
      .eq('actor_id', user.id)
      .eq('action', 'owner.communication.retracted')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const actions = (actionsRaw ?? []) as OwnerAction[];
  const retractedActionIds = (retractions ?? [])
    .map((item: any) => String(item.metadata?.original_action_id ?? ''))
    .filter(Boolean);

  const notificationIds = Array.from(
    new Set(
      actions.flatMap((action) =>
        Array.isArray(action.metadata?.notification_ids)
          ? action.metadata!.notification_ids!.map((value) => String(value)).filter(Boolean)
          : []
      )
    )
  );

  const { data: receiptRows } = notificationIds.length
    ? await supabase
        .from('notifications')
        .select('id,recipient_id,read_at,created_at')
        .eq('organization_id', profile.organization_id)
        .in('id', notificationIds)
    : { data: [] as { id: string; recipient_id: string; read_at: string | null; created_at: string }[] };

  const receiptById = new Map((receiptRows ?? []).map((row: any) => [String(row.id), row]));
  const staffNameById = new Map((staff ?? []).map((person: any) => [String(person.id), person.full_name || person.email || 'Staff']));

  const actionsWithReceipts = actions.map((action) => {
    const ids = Array.isArray(action.metadata?.notification_ids)
      ? action.metadata!.notification_ids!.map((value) => String(value)).filter(Boolean)
      : [];
    const rows = ids.map((id) => receiptById.get(id)).filter(Boolean) as any[];
    const readRows = rows.filter((row) => Boolean(row.read_at));
    const unreadRows = rows.filter((row) => !row.read_at);
    const originalRecipientNames = Array.isArray(action.metadata?.recipient_names) ? action.metadata!.recipient_names! : [];

    return {
      ...action,
      receipt: {
        sent: ids.length,
        delivered: rows.length,
        read: readRows.length,
        unread: unreadRows.length,
        readNames: readRows.map((row) => staffNameById.get(String(row.recipient_id)) || 'Staff'),
        unreadNames: unreadRows.map((row) => staffNameById.get(String(row.recipient_id)) || 'Staff'),
        recipientNames: originalRecipientNames,
      },
    };
  });

  const totalActive = staff?.length ?? 0;
  const totalUnreadOwnerMessages = actionsWithReceipts.reduce((sum, action) => sum + (action.receipt?.unread ?? 0), 0);

  return (
    <WorkspaceShell title="Owner Communications" subtitle="Broadcast, private messaging, read receipts and reversible owner sends" profile={profile}>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe5eb] pb-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#52738f]">Owner command center</div>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.025em] text-[#172b3a]">Communications</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#687988]">Send team instructions or private staff messages, monitor readership and retract a send when necessary.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-[#cbd8e3] bg-[#edf3f8] px-4 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.09em] text-[#52738f]">Active recipients</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-[#172b3a]">{totalActive}</div>
            </div>
            <div className="rounded-xl border border-[#ead9a9] bg-[#fff5dc] px-4 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.09em] text-[#946200]">Unread</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-[#172b3a]">{totalUnreadOwnerMessages}</div>
            </div>
          </div>
        </section>

        <OwnerCommunicationsPanel staff={staff ?? []} actions={actionsWithReceipts} retractedActionIds={retractedActionIds} />
      </div>
    </WorkspaceShell>
  );
}
