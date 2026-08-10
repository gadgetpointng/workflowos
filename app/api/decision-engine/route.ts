import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';
import { scoreSignal, recommendationForSignal } from '@/lib/decision/scoring';
import { capabilityForOpportunity } from '@/lib/decision/routing';

export async function POST() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const orgId = profile.organization_id;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: signals, error } = await supabase.from('commerce_signals').select('*').eq('organization_id', orgId).gte('observed_at', since).order('observed_at', { ascending: false }).limit(250);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const created: any[] = [];
  for (const signal of signals ?? []) {
    const score = scoreSignal(signal);
    if (score < 62) continue;
    const rec = recommendationForSignal(signal, score);
    const capability = capabilityForOpportunity(rec.type);
    const { data: staff } = await supabase.from('staff_capabilities').select('profile_id,proficiency').eq('organization_id', orgId).eq('capability', capability).eq('active', true).order('proficiency', { ascending: false }).limit(1).maybeSingle();
    const fingerprint = `${signal.id}:${rec.type}`;
    const { data: existing } = await supabase.from('growth_recommendations').select('id').eq('organization_id', orgId).contains('evidence', { fingerprint }).maybeSingle();
    if (existing) continue;
    const { data: row } = await supabase.from('growth_recommendations').insert({
      organization_id: orgId,
      recommendation_type: rec.type,
      title: rec.title,
      rationale: rec.action,
      score,
      recommended_assignee: staff?.profile_id ?? null,
      action_payload: { capability, signal_id: signal.id, source: signal.source, product_ref: signal.product_ref },
      evidence: { fingerprint, signal_type: signal.signal_type, observed_at: signal.observed_at, quantity: signal.quantity, value: signal.value }
    }).select().single();
    if (row) created.push(row);
  }
  return NextResponse.json({ ok: true, analyzed: signals?.length ?? 0, created: created.length, recommendations: created });
}
