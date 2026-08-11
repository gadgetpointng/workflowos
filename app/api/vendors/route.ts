import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';

export async function POST(req: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (!String(body.name || '').trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const rate = Math.max(0, Math.min(100, Number(body.commission_rate || 0)));
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      organization_id: profile.organization_id,
      name: String(body.name).trim(),
      contact_email: body.contact_email || null,
      contact_phone: body.contact_phone || null,
      status: 'active',
      commission_rate: rate,
      source_url: body.source_url || null,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ vendor: data }, { status: 201 });
}
