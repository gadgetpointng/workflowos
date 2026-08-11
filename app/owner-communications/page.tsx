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
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Owner command center</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Communications</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Send a feed to all active staff or a private message to one staff member. Track who has read each message and retract a send from the audit trail when needed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Active recipients</div>
              <div className="text-xl font-black text-slate-950">{totalActive}</div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-amber-700">Unread owner messages</div>
              <div className="text-xl font-black text-slate-950">{totalUnreadOwnerMessages}</div>
            </div>
          </div>
        </section>

        <OwnerCommunicationsPanel staff={staff ?? []} actions={actionsWithReceipts} retractedActionIds={retractedActionIds} />
      </div>
    </WorkspaceShell>
  );
}
