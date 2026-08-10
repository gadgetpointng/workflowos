import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { capabilityForOpportunity } from '@/lib/decision/routing';

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: opp, error } = await supabase.from('growth_opportunities').select('*').eq('id', id).eq('organization_id', profile.organization_id).single();
  if (error || !opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
  if (opp.created_task_id) return NextResponse.json({ ok: true, task_id: opp.created_task_id, duplicate: true });
  const capability = capabilityForOpportunity(opp.opportunity_type);
  const { data: staff } = await supabase.from('staff_capabilities').select('profile_id,proficiency').eq('organization_id', profile.organization_id).eq('capability', capability).eq('active', true).order('proficiency', { ascending: false }).limit(1).maybeSingle();
  const { data: task, error: taskError } = await supabase.from('tasks').insert({ organization_id: profile.organization_id, title: opp.title, description: `${opp.summary ?? ''}\n\nRecommended action: ${opp.recommended_action ?? 'Review and act.'}`, creator_id: profile.id, assignee_id: staff?.profile_id ?? opp.assigned_to ?? null, department: capability === 'operations' ? null : capability, priority: Number(opp.score) >= 85 ? 'high' : 'medium', status: staff?.profile_id || opp.assigned_to ? 'assigned' : 'draft' }).select().single();
  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 400 });
  await supabase.from('growth_opportunities').update({ status: 'converted', created_task_id: task.id, assigned_to: task.assignee_id, updated_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true, task });
}
