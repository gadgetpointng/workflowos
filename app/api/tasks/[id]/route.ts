import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const allowed = ['accepted', 'in_progress', 'submitted', 'approved', 'completed', 'rejected', 'cancelled', 'assigned'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: task } = await supabase.from('tasks').select('*').eq('id', id).single();
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  if (body.status && !allowed.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const manager = canManage(profile.role);
  if (!manager && task.assignee_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (['approved', 'rejected', 'cancelled'].includes(body.status) && !manager) {
    return NextResponse.json({ error: 'Manager approval required' }, { status: 403 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ['status', 'completion_notes', 'completion_evidence_url', 'approval_notes', 'assignee_id', 'due_at', 'priority']) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    actor_id: user.id,
    action: `task.${body.status || 'updated'}`,
    entity_type: 'task',
    entity_id: id,
    metadata: { from: task.status, to: body.status },
  });

  if (task.creator_id && body.status === 'submitted') {
    const admin = createAdminClient();
    await admin.from('notifications').insert({
      organization_id: profile.organization_id,
      recipient_id: task.creator_id,
      title: 'Task submitted for approval',
      body: task.title,
      type: 'task_submitted',
    });
  }

  return NextResponse.json({ data });
}
