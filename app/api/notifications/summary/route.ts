import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

function storedNotificationPrefix(type: unknown) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'owner_feed' || normalized === 'owner_private_message') return 'message';
  if (normalized === 'buyer_request') return 'buyer';
  if (normalized === 'task' || normalized === 'task_assigned') return 'assignment';
  if (normalized === 'automation') return 'automation';
  return 'general';
}

export async function GET() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const org = profile.organization_id;
  const role = String(profile.role || 'member').toLowerCase();
  const canManage = ['owner', 'admin', 'manager'].includes(role);
  const now = new Date().toISOString();

  let taskQuery = supabase
    .from('tasks')
    .select('id,priority,due_at,status,assignee_id')
    .eq('organization_id', org)
    .lt('due_at', now)
    .not('status', 'in', '("completed","approved","cancelled")')
    .limit(100);

  let followupQuery = supabase
    .from('lead_followups')
    .select('id,due_at,status,assigned_to')
    .eq('organization_id', org)
    .lt('due_at', now)
    .not('status', 'in', '("completed","cancelled")')
    .limit(100);

  if (!canManage) {
    taskQuery = taskQuery.eq('assignee_id', user.id);
    followupQuery = followupQuery.eq('assigned_to', user.id);
  }

  const [taskQ, followupQ, approvalQ, bridgeQ, storedQ] = await Promise.all([
    taskQuery,
    followupQuery,
    canManage
      ? supabase
          .from('approvals')
          .select('id')
          .eq('organization_id', org)
          .eq('status', 'pending')
          .limit(100)
      : Promise.resolve({ data: [] as { id: string }[] }),
    canManage
      ? supabase
          .from('external_integrations')
          .select('id,status')
          .eq('organization_id', org)
          .eq('slug', 'gadgetpoint')
          .maybeSingle()
      : Promise.resolve({ data: null as { id?: string; status?: string } | null }),
    supabase
      .from('notifications')
      .select('id,type')
      .eq('organization_id', org)
      .eq('recipient_id', user.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const urgentIds = new Set<string>();

  for (const task of taskQ.data ?? []) {
    const priority = String(task.priority || '').toLowerCase();
    if (priority === 'urgent' || priority === 'high') urgentIds.add(`task:${task.id}`);
  }

  for (const followup of followupQ.data ?? []) {
    urgentIds.add(`followup:${followup.id}`);
  }

  for (const approval of approvalQ.data ?? []) {
    urgentIds.add(`approval:${approval.id}`);
  }

  for (const notification of storedQ.data ?? []) {
    urgentIds.add(`${storedNotificationPrefix(notification.type)}:${notification.id}`);
  }

  if (canManage) {
    const bridge = bridgeQ.data as { id?: string; status?: string } | null;
    const connected = bridge && ['active', 'connected'].includes(String(bridge.status || '').toLowerCase());
    if (!connected) urgentIds.add('integration:gadgetpoint');
  }

  const ids = Array.from(urgentIds).sort();

  return NextResponse.json(
    {
      urgentCount: ids.length,
      urgentIds: ids,
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
