import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';

export async function POST() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const org = profile.organization_id;
  const { data: rules } = await supabase.from('sla_rules').select('*').eq('organization_id', org).eq('active', true);
  let created = 0;
  for (const rule of rules ?? []) {
    if (rule.entity_type !== 'lead') continue;
    const cutoff = new Date(Date.now() - rule.response_minutes * 60_000).toISOString();
    let q = supabase.from('leads').select('*').eq('organization_id', org).lt('created_at', cutoff).is('last_contacted_at', null);
    if (rule.source) q = q.eq('source', rule.source);
    const { data: overdue } = await q.limit(100);
    for (const lead of overdue ?? []) {
      const fingerprint = `sla:${rule.id}:${lead.id}`;
      const { data: existing } = await supabase.from('tasks').select('id').eq('organization_id', org).eq('completion_notes', fingerprint).maybeSingle();
      if (existing) continue;
      const { data: staff } = await supabase.from('staff_capabilities').select('profile_id').eq('organization_id', org).eq('capability', rule.capability).eq('active', true).order('proficiency', { ascending: false }).limit(1).maybeSingle();
      const { error } = await supabase.from('tasks').insert({ organization_id: org, title: `SLA follow-up: ${lead.name || lead.phone || 'lead'}`, description: `Lead from ${lead.source || 'unknown source'} has exceeded the ${rule.response_minutes}-minute response target.`, creator_id: profile.id, assignee_id: staff?.profile_id ?? lead.assigned_to ?? null, priority: rule.priority, status: staff?.profile_id || lead.assigned_to ? 'assigned' : 'draft', due_at: new Date(Date.now()+60*60_000).toISOString(), completion_notes: fingerprint });
      if (!error) created++;
    }
  }
  return NextResponse.json({ ok: true, rules: rules?.length ?? 0, tasks_created: created });
}
