import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeWorkflowOSPermissions } from '@/lib/workflow-access';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const GADGETPOINT_REDEEM_ENDPOINT = 'https://gadgetpoint.ng/api/workflowos/access-redeem';
const CODE_RE = /^[0-9a-f]{64}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { code?: unknown } | null;
  const code = String(body?.code ?? '').trim();
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: 'Invalid GadgetPoint access sync code' }, { status: 401 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let redeemed: { staff?: { external_staff_id?: unknown; enabled?: unknown; workflow_permissions?: unknown; updated_at?: unknown } } | null = null;
  try {
    const response = await fetch(GADGETPOINT_REDEEM_ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      cache: 'no-store',
      signal: controller.signal,
    });
    redeemed = await response.json().catch(() => null);
    if (!response.ok) return NextResponse.json({ error: 'GadgetPoint access sync code was rejected' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'GadgetPoint access sync could not be verified' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  const externalStaffId = String(redeemed?.staff?.external_staff_id ?? '').trim().toLowerCase();
  const enabled = redeemed?.staff?.enabled === true;
  const permissions = normalizeWorkflowOSPermissions(redeemed?.staff?.workflow_permissions);
  if (!externalStaffId.includes('@') || externalStaffId === OWNER_EMAIL || (enabled && permissions.length === 0)) {
    return NextResponse.json({ error: 'Invalid GadgetPoint staff access payload' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from('external_integrations')
    .select('id,organization_id,status')
    .eq('slug', 'gadgetpoint')
    .eq('base_url', 'https://gadgetpoint.ng')
    .maybeSingle();
  if (!integration || !['active', 'connected'].includes(String(integration.status ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'The GadgetPoint integration is not active' }, { status: 403 });
  }

  const { data: connectedStaff } = await admin
    .from('connected_staff')
    .select('id,profile_id,metadata')
    .eq('integration_id', integration.id)
    .eq('external_staff_id', externalStaffId)
    .maybeSingle();

  if (!connectedStaff) {
    return NextResponse.json({ ok: true, pending: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const now = new Date().toISOString();
  const metadata = {
    ...(connectedStaff.metadata ?? {}),
    workflowos_access_enabled: enabled,
    workflowos_permissions: permissions,
    workflowos_access_updated_at: String(redeemed?.staff?.updated_at ?? now),
    workflowos_access_source: 'gadgetpoint-owner-control',
  };
  const { error: updateError } = await admin
    .from('connected_staff')
    .update({ metadata, updated_at: now, last_synced_at: now })
    .eq('id', connectedStaff.id);
  if (updateError) {
    return NextResponse.json({ error: 'WorkflowOS could not save staff access' }, { status: 500 });
  }

  if (connectedStaff.profile_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(connectedStaff.profile_id);
    const existing = (authUser?.user?.app_metadata ?? {}) as Record<string, unknown>;
    const { error: authError } = await admin.auth.admin.updateUserById(connectedStaff.profile_id, {
      app_metadata: {
        ...existing,
        workflowos_identity_source: 'gadgetpoint-staff-authorization-code',
        workflowos_access_enabled: enabled,
        workflowos_permissions: permissions,
      },
    });
    if (authError) {
      return NextResponse.json({ error: 'WorkflowOS could not update the active staff session policy' }, { status: 500 });
    }
  }

  await admin.from('activity_logs').insert({
    organization_id: integration.organization_id,
    actor_id: connectedStaff.profile_id,
    action: enabled ? 'auth.gadgetpoint.staff_access.granted' : 'auth.gadgetpoint.staff_access.revoked',
    entity_type: 'connected_staff',
    entity_id: connectedStaff.id,
    metadata: {
      external_staff_id: externalStaffId,
      workflowos_permissions: permissions,
      source: 'gadgetpoint-owner-control',
    },
  });

  return NextResponse.json({ ok: true, pending: false }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
