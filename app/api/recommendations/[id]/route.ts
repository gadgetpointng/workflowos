import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!['accepted','dismissed','completed'].includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const { data: rec } = await supabase.from('growth_recommendations').select('*').eq('id', id).eq('organization_id', profile.organization_id).single();
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let createdTaskId = rec.created_task_id;
  if (body.status === 'accepted' && body.create_task && !createdTaskId) {
    const { data: task, error: taskError } = await supabase.from('tasks').insert({
      organization_id: profile.organization_id,
      title: rec.title,
      description: rec.rationale ?? 'Created from WorkflowOS recommendation.',
      creator_id: profile.id,
      assignee_id: body.assignee_id ?? rec.recommended_assignee ?? null,
      priority: rec.score >= 85 ? 'urgent' : rec.score >= 70 ? 'high' : 'medium',
      status: body.assignee_id || rec.recommended_assignee ? 'assigned' : 'draft',
      due_at: body.due_at ?? null
    }).select().single();
    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 400 });
    createdTaskId = task.id;
    await supabase.from('recommendation_actions').insert({ organization_id: profile.organization_id, recommendation_id: id, actor_id: profile.id, action: 'task_created', metadata: { task_id: task.id } });
  }

  const { data, error } = await supabase.from('growth_recommendations').update({ status: body.status, created_task_id: createdTaskId, updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', profile.organization_id).select().single();
  if (!error) await supabase.from('recommendation_actions').insert({ organization_id: profile.organization_id, recommendation_id: id, actor_id: profile.id, action: body.status, notes: body.notes ?? null });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ recommendation: data });
}
