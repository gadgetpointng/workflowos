import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';

export async function GET() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('staff_capabilities').select('*,profiles(full_name,email,role,department,active)').eq('organization_id', profile.organization_id).order('capability');
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ capabilities: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (!body.profile_id || !body.capability) return NextResponse.json({ error: 'profile_id and capability are required' }, { status: 400 });
  const row = { organization_id: profile.organization_id, profile_id: body.profile_id, capability: String(body.capability).trim().toLowerCase(), proficiency: Math.min(5, Math.max(1, Number(body.proficiency ?? 3))), active: body.active !== false, metadata: body.metadata ?? {}, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('staff_capabilities').upsert(row, { onConflict: 'profile_id,capability' }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ capability: data });
}
