import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';
import { KIND_CAPABILITY_PRESETS, type IntegrationKind } from '@/lib/integrations/capabilities';

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('external_integrations').select('*').order('created_at');
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function POST(req: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  if (!body.name || !body.slug || !body.kind) return NextResponse.json({ error: 'name, slug and kind are required' }, { status: 400 });
  const { data, error } = await supabase.from('external_integrations').insert({
    organization_id: profile.organization_id,
    name: body.name,
    slug: body.slug,
    kind: body.kind,
    status: body.status ?? 'pending',
    base_url: body.base_url ?? null,
    capabilities: Array.isArray(body.capabilities) ? body.capabilities : (KIND_CAPABILITY_PRESETS[body.kind as IntegrationKind] ?? ['events']),
    settings: body.settings ?? {}
  }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ data }, { status: 201 });
}
