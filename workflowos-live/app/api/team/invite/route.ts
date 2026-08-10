import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const allowedRoles = new Set(['admin','manager','marketing','sales','staff']);

export async function POST(req: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const email = String(body.email || '').trim().toLowerCase();
  const fullName = String(body.full_name || '').trim();
  const department = body.department ? String(body.department).trim() : null;
  const role = allowedRoles.has(String(body.role)) ? String(body.role) : 'staff';
  if (!email.includes('@') || fullName.length < 2) {
    return NextResponse.json({ error: 'A valid email and full name are required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback`,
    data: { full_name: fullName, invited_to_workflowos: true }
  });
  if (error || !data.user) return NextResponse.json({ error: error?.message || 'Invite failed' }, { status: 400 });

  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    organization_id: profile.organization_id,
    full_name: fullName,
    email,
    role,
    department,
    active: true
  }, { onConflict: 'id' });

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  await admin.from('activity_logs').insert({
    organization_id: profile.organization_id,
    actor_id: user.id,
    action: 'staff.invited',
    entity_type: 'profile',
    entity_id: data.user.id,
    metadata: { email, role, department }
  });

  return NextResponse.json({ ok: true, user_id: data.user.id });
}
