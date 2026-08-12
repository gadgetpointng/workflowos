import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { authenticateBridge } from '@/lib/integrations/bridge';
import { canPublishEvents } from '@/lib/integrations/capabilities';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

const allowedStaffRoles = new Set([
  'admin',
  'manager',
  'marketing',
  'sales',
  'staff',
]);

const gadgetPointRoleAliases: Record<string, string> = {
  administrator: 'admin',
  'store manager': 'manager',
  'sales staff': 'sales',
  'marketing staff': 'marketing',
  employee: 'staff',
};

function normalizeStaffRole(role: unknown) {
  const value = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  const normalized = gadgetPointRoleAliases[value] ?? value;
  return allowedStaffRoles.has(normalized) ? normalized : 'staff';
}

function staffIdentityEmail(externalStaffId: string, username: string) {
  const label = String(username || 'staff')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 32) || 'staff';
  const digest = crypto
    .createHash('sha256')
    .update(externalStaffId)
    .digest('hex')
    .slice(0, 16);

  // Reserved non-delivery identity used only to establish the WorkflowOS session.
  return `${label}.${digest}@staff.workflowos.invalid`;
}

export async function POST(request: Request) {
  const auth = await authenticateBridge(request, 'gadgetpoint');

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const { supabase, integration } = auth;

  if (!canPublishEvents(integration.capabilities)) {
    return NextResponse.json(
      { error: 'Integration is not permitted to publish staff identity events' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const externalStaffId = String(
    body.id ?? body.staff_id ?? body.username ?? ''
  ).trim();
  const username = String(body.username ?? externalStaffId).trim();

  if (!externalStaffId) {
    return NextResponse.json(
      { error: 'A GadgetPoint staff id or username is required' },
      { status: 400 }
    );
  }

  if (body.active === false || String(body.status ?? '').toLowerCase() === 'inactive') {
    return NextResponse.json(
      { error: 'This GadgetPoint staff account is inactive' },
      { status: 403 }
    );
  }

  const suppliedEmail = String(body.email ?? '').trim().toLowerCase();
  const ownerIdentityAttempt = [
    suppliedEmail,
    externalStaffId.toLowerCase(),
    username.toLowerCase(),
  ].includes(OWNER_EMAIL);

  if (ownerIdentityAttempt) {
    return NextResponse.json(
      { error: 'The GadgetPoint owner identity must use the owner sign-in route' },
      { status: 403 }
    );
  }

  const { data: existingStaff } = await supabase
    .from('connected_staff')
    .select('id,status')
    .eq('integration_id', integration.id)
    .eq('external_staff_id', externalStaffId)
    .maybeSingle();

  if (existingStaff?.status === 'inactive') {
    return NextResponse.json(
      { error: 'This GadgetPoint staff account is inactive' },
      { status: 403 }
    );
  }

  const hasExternalEmail = suppliedEmail.includes('@');
  const email = hasExternalEmail
    ? suppliedEmail
    : staffIdentityEmail(externalStaffId, username);
  const fullName = String(
    body.full_name ?? body.name ?? username ?? externalStaffId
  ).trim();
  const role = normalizeStaffRole(body.role);
  const department = body.department
    ? String(body.department).trim()
    : null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);
  const code = crypto.randomBytes(32).toString('base64url');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  const { error: staffError } = await supabase
    .from('connected_staff')
    .upsert(
      {
        organization_id: integration.organization_id,
        integration_id: integration.id,
        external_staff_id: externalStaffId,
        email,
        full_name: fullName || username || externalStaffId,
        role,
        department,
        status: 'active',
        metadata: {
          ...(body.metadata ?? {}),
          username: username || null,
          identity_source: 'gadgetpoint-staff-login',
          workflowos_identity_kind: hasExternalEmail ? 'external_email' : 'non_delivery_staff_identity',
          external_email: hasExternalEmail ? suppliedEmail : null,
          password_owner: 'gadgetpoint',
        },
        last_synced_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'integration_id,external_staff_id' }
    );

  if (staffError) {
    return NextResponse.json(
      { error: staffError.message },
      { status: 400 }
    );
  }

  const { error: eventError } = await supabase
    .from('integration_events')
    .insert({
      organization_id: integration.organization_id,
      integration_id: integration.id,
      source: 'gadgetpoint',
      event_type: 'staff.sso',
      entity_type: 'staff_sso',
      entity_id: codeHash,
      payload: {
        version: 2,
        expires_at: expiresAt.toISOString(),
        staff: {
          external_staff_id: externalStaffId,
          username: username || null,
          email,
          external_email: hasExternalEmail ? suppliedEmail : null,
          full_name: fullName || username || externalStaffId,
          role,
          department,
          workflowos_identity_kind: hasExternalEmail ? 'external_email' : 'non_delivery_staff_identity',
        },
      },
      processed_at: now.toISOString(),
    });

  if (eventError) {
    return NextResponse.json(
      { error: eventError.message },
      { status: 400 }
    );
  }

  await supabase
    .from('external_integrations')
    .update({
      status: 'connected',
      last_synced_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', integration.id);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  return NextResponse.json({
    ok: true,
    login_url: `${appUrl}/auth/gadgetpoint?code=${encodeURIComponent(code)}`,
    expires_at: expiresAt.toISOString(),
    expires_in_seconds: 120,
  });
}
