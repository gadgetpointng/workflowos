import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';

export async function GET() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('marketplace_jobs').select('*,marketplaces(name,slug)').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }).limit(100);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ jobs: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile.role) && profile.role !== 'marketing') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (!body.job_type) return NextResponse.json({ error: 'job_type is required' }, { status: 400 });
  const { data, error } = await supabase.from('marketplace_jobs').insert({ organization_id: profile.organization_id, marketplace_id: body.marketplace_id ?? null, connection_id: body.connection_id ?? null, job_type: body.job_type, product_ref: body.product_ref ?? null, input: body.input ?? {}, requested_by: profile.id, assigned_to: body.assigned_to ?? null }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ job: data }, { status: 201 });
}
