import { NextResponse } from 'next/server';
import { canManage, requireUser } from '@/lib/auth';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile.role)) return NextResponse.json({ error: 'Manager approval required' }, { status: 403 });
  const body = await request.json();
  const action = String(body.action ?? '');
  if (!['approve','cancel','retry'].includes(action)) return NextResponse.json({ error: 'action must be approve, cancel or retry' }, { status: 400 });
  const now = new Date().toISOString();
  const patch = action === 'approve'
    ? { status: 'approved', approved_by: user.id, approved_at: now, updated_at: now }
    : action === 'retry'
      ? { status: 'approved', failed_at: null, last_error: null, updated_at: now }
      : { status: 'cancelled', updated_at: now };
  const { data, error } = await supabase.from('integration_commands').update(patch).eq('organization_id', profile.organization_id).eq('id', id).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ data });
}
