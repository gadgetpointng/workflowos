import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function advance(from: string | Date, cadence: string) {
  const d = new Date(from);
  if (cadence === 'daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (cadence === 'weekdays') { do { d.setUTCDate(d.getUTCDate() + 1); } while ([0, 6].includes(d.getUTCDay())); }
  else if (cadence === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString();
}

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  const now = new Date();
  const result = { recurringGenerated: 0, recurringFailed: 0, slaTasksCreated: 0, organizationsProcessed: 0 };

  const { data: orgs, error: orgError } = await admin.from('organizations').select('id').limit(500);
  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });

  for (const org of orgs ?? []) {
    result.organizationsProcessed++;
    const { data: owner } = await admin.from('profiles').select('id').eq('organization_id', org.id).in('role', ['owner','admin']).eq('active', true).limit(1).maybeSingle();

    const { data: templates } = await admin.from('recurring_work_templates').select('*').eq('organization_id', org.id).eq('active', true).lte('next_run_at', now.toISOString()).limit(100);
    for (const t of templates ?? []) {
      try {
        let assignee = t.assignee_id as string | null;
        if (!assignee) {
          const { data: caps } = await admin.from('staff_capabilities').select('profile_id,proficiency').eq('organization_id', org.id).eq('capability', t.capability).eq('active', true).order('proficiency', { ascending: false }).limit(20);
          const ids = (caps ?? []).map((x: any) => x.profile_id);
          if (ids.length) {
            const { data: available } = await admin.from('staff_availability').select('user_id,status').eq('organization_id', org.id).in('user_id', ids);
            const blocked = new Set((available ?? []).filter((x: any) => ['offline','leave','away'].includes(x.status)).map((x: any) => x.user_id));
            const eligible = ids.filter((id: string) => !blocked.has(id));
            const pool = eligible.length ? eligible : ids;
            const { data: open } = await admin.from('tasks').select('assignee_id').eq('organization_id', org.id).in('assignee_id', pool).not('status', 'in', '("completed","cancelled")');
            const counts = new Map(pool.map((id: string) => [id, 0]));
            (open ?? []).forEach((x: any) => counts.set(x.assignee_id, (counts.get(x.assignee_id) || 0) + 1));
            assignee = [...pool].sort((a, b) => (counts.get(a) || 0) - (counts.get(b) || 0))[0] ?? null;
          }
        }
        const due = new Date(now.getTime() + Number(t.due_offset_hours || 24) * 3600000).toISOString();
        const { data: task, error } = await admin.from('tasks').insert({ organization_id: org.id, title: t.name, description: t.description, creator_id: owner?.id ?? null, assignee_id: assignee, department: t.department || t.capability, priority: t.priority, status: assignee ? 'assigned' : 'draft', due_at: due }).select('id').single();
        if (error) throw error;
        await admin.from('recurring_work_runs').insert({ organization_id: org.id, template_id: t.id, task_id: task.id, status: 'generated', generated_for: now.toISOString(), metadata: { cron: true } });
        await admin.from('recurring_work_templates').update({ last_generated_at: now.toISOString(), next_run_at: advance(t.next_run_at || now, t.cadence), updated_at: now.toISOString() }).eq('id', t.id);
        if (assignee) await admin.from('notifications').insert({ organization_id: org.id, recipient_id: assignee, title: 'Recurring task assigned', body: t.name, type: 'task' });
        result.recurringGenerated++;
      } catch (e: any) {
        result.recurringFailed++;
        await admin.from('recurring_work_runs').insert({ organization_id: org.id, template_id: t.id, status: 'failed', generated_for: now.toISOString(), metadata: { cron: true, error: e?.message || 'Generation failed' } });
      }
    }

    const { data: rules } = await admin.from('sla_rules').select('*').eq('organization_id', org.id).eq('active', true);
    for (const rule of rules ?? []) {
      if (rule.entity_type !== 'lead') continue;
      const cutoff = new Date(Date.now() - rule.response_minutes * 60_000).toISOString();
      let query = admin.from('leads').select('*').eq('organization_id', org.id).lt('created_at', cutoff).is('last_contacted_at', null);
      if (rule.source) query = query.eq('source', rule.source);
      const { data: overdue } = await query.limit(100);
      for (const lead of overdue ?? []) {
        const fingerprint = `sla:${rule.id}:${lead.id}`;
        const { data: existing } = await admin.from('tasks').select('id').eq('organization_id', org.id).eq('completion_notes', fingerprint).maybeSingle();
        if (existing) continue;
        const { data: staff } = await admin.from('staff_capabilities').select('profile_id').eq('organization_id', org.id).eq('capability', rule.capability).eq('active', true).order('proficiency', { ascending: false }).limit(1).maybeSingle();
        const assignee = staff?.profile_id ?? lead.assigned_to ?? null;
        const { error } = await admin.from('tasks').insert({ organization_id: org.id, title: `SLA follow-up: ${lead.name || lead.phone || 'lead'}`, description: `Lead from ${lead.source || 'unknown source'} exceeded the ${rule.response_minutes}-minute response target.`, creator_id: owner?.id ?? null, assignee_id: assignee, priority: rule.priority, status: assignee ? 'assigned' : 'draft', due_at: new Date(Date.now() + 60 * 60_000).toISOString(), completion_notes: fingerprint });
        if (!error) result.slaTasksCreated++;
      }
    }
  }

  return NextResponse.json({ ok: true, ...result, ranAt: now.toISOString() });
}
