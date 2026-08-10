import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';

export async function GET() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('shared_identity_links').select('*,profiles(full_name,email,role),external_integrations(name,slug)').eq('organization_id', profile.organization_id).order('created_at', { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ links: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (!body.integration_id || !body.external_staff_id || !body.profile_id) return NextResponse.json({ error: 'integration_id, external_staff_id and profile_id are required' }, { status: 400 });
  const { data, error } = await supabase.from('shared_identity_links').upsert({ organization_id: profile.organization_id, integration_id: body.integration_id, external_staff_id: String(body.external_staff_id), external_email: body.external_email ?? null, profile_id: body.profile_id, verified_at: new Date().toISOString(), metadata: body.metadata ?? {}, updated_at: new Date().toISOString() }, { onConflict: 'integration_id,external_staff_id' }).select().single();
  if (!error) await supabase.from('connected_staff').update({ profile_id: body.profile_id, updated_at: new Date().toISOString() }).eq('integration_id', body.integration_id).eq('external_staff_id', String(body.external_staff_id));
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ link: data });
}
