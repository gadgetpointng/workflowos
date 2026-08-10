import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('growth_opportunities').select('*').order('score', { ascending: false }).limit(100);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function POST(req: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile?.role) && profile?.role !== 'marketing' && profile?.role !== 'sales') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  if (!body.title || !body.source || !body.opportunity_type) return NextResponse.json({ error: 'title, source and opportunity_type are required' }, { status: 400 });
  const { data, error } = await supabase.from('growth_opportunities').insert({
    organization_id: profile.organization_id,
    title: body.title,
    summary: body.summary ?? null,
    source: body.source,
    opportunity_type: body.opportunity_type,
    score: body.score ?? 0,
    product_ref: body.product_ref ?? null,
    recommended_action: body.recommended_action ?? null,
    evidence: body.evidence ?? {},
    assigned_to: body.assigned_to ?? null
  }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ data }, { status: 201 });
}
