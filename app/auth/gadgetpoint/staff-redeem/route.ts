import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeWorkflowOSPermissions } from '@/lib/workflow-access';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const GADGETPOINT_REDEEM_ENDPOINT = 'https://gadgetpoint.ng/api/workflowos/staff-redeem';
const CODE_RE = /^[0-9a-f]{64}$/i;
const STAFF_ROLES = new Set(['admin', 'manager', 'marketing', 'sales', 'staff']);
const ROLE_ALIASES: Record<string, string> = {
  administrator: 'admin',
  'store manager': 'manager',
  'sales staff': 'sales',
  'marketing staff': 'marketing',
  employee: 'staff',
  'inventory staff': 'staff',
  'delivery staff': 'staff',
};

type RedeemedStaff = {
  external_staff_id?: unknown;
  username?: unknown;
  email?: unknown;
  full_name?: unknown;
  role?: unknown;
  department?: unknown;
  branch?: unknown;
  dashboard_permissions?: unknown;
  workflow_permissions?: unknown;
  workflowos_access_enabled?: unknown;
  active?: unknown;
  status?: unknown;
};

function loginError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

function normalizeRole(value: unknown) {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  const role = ROLE_ALIASES[raw] ?? raw;
  return STAFF_ROLES.has(role) ? role : 'staff';
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = String(requestUrl.searchParams.get('code') ?? '').trim();
  if (!CODE_RE.test(code)) {
    return loginError(request, 'The GadgetPoint staff sign-in code is invalid or expired.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let redeemed: { staff?: RedeemedStaff } | null = null;
  try {
    const response = await fetch(GADGETPOINT_REDEEM_ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
      cache: 'no-store',
      signal: controller.signal,
    });
    redeemed = await response.json().catch(() => null);
    if (!response.ok) {
      return loginError(request, 'The GadgetPoint staff sign-in code is invalid or expired.');
    }
  } catch {
    return loginError(request, 'WorkflowOS could not verify the GadgetPoint staff handoff. Please try again.');
  } finally {
    clearTimeout(timeout);
  }

  const staff = redeemed?.staff ?? {};
  const externalStaffId = String(staff.external_staff_id ?? '').trim().toLowerCase();
  const username = String(staff.username ?? '').trim();
  const email = String(staff.email ?? '').trim().toLowerCase();
  const fullName = String(staff.full_name ?? '').trim();
  const department = String(staff.department ?? '').trim() || null;
  const role = normalizeRole(staff.role);
  const workflowPermissions = normalizeWorkflowOSPermissions(staff.workflow_permissions);
  const workflowAccessEnabled = staff.workflowos_access_enabled === true;
  const inactive = staff.active === false || String(staff.status ?? '').trim().toLowerCase() === 'inactive';

  if (!externalStaffId || !username || !email.includes('@') || !fullName || inactive || email === OWNER_EMAIL) {
    return loginError(request, 'The GadgetPoint staff identity is incomplete or not authorized for WorkflowOS.');
  }
  if (!workflowAccessEnabled || workflowPermissions.length === 0) {
    return loginError(request, 'The GadgetPoint owner has not granted this staff member WorkflowOS access.');
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from('external_integrations')
    .select('id,organization_id,status')
    .eq('slug', 'gadgetpoint')
    .eq('base_url', 'https://gadgetpoint.ng')
    .maybeSingle();

  if (!integration || !['active', 'connected'].includes(String(integration.status ?? '').toLowerCase())) {
    return loginError(request, 'The GadgetPoint integration is not active in WorkflowOS.');
  }

  const { data: existingStaff } = await admin
    .from('connected_staff')
    .select('id,status,metadata')
    .eq('integration_id', integration.id)
    .eq('external_staff_id', externalStaffId)
    .maybeSingle();

  if (existingStaff?.status === 'inactive') {
    return loginError(request, 'This GadgetPoint staff account is inactive in WorkflowOS.');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);
  const workflowCode = crypto.randomBytes(32).toString('base64url');
  const workflowCodeHash = crypto.createHash('sha256').update(workflowCode).digest('hex');
  const sourceFingerprint = crypto.createHash('sha256').update(code).digest('hex').slice(0, 12);

  const { error: staffError } = await admin
    .from('connected_staff')
    .upsert(
      {
        organization_id: integration.organization_id,
        integration_id: integration.id,
        external_staff_id: externalStaffId,
        email,
        full_name: fullName,
        role,
        department,
        status: 'active',
        metadata: {
          ...(existingStaff?.metadata ?? {}),
          username,
          branch: staff.branch ?? null,
          dashboard_permissions: Array.isArray(staff.dashboard_permissions) ? staff.dashboard_permissions : [],
          workflowos_access_enabled: true,
          workflowos_permissions: workflowPermissions,
          workflowos_access_source: 'gadgetpoint-owner-control',
          identity_source: 'gadgetpoint-staff-authorization-code',
          workflowos_identity_kind: 'external_email',
          external_email: email,
          password_owner: 'gadgetpoint',
        },
        last_synced_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'integration_id,external_staff_id' }
    );

  if (staffError) {
    return loginError(request, 'WorkflowOS could not register this GadgetPoint staff identity.');
  }

  const { error: eventError } = await admin.from('integration_events').insert({
    organization_id: integration.organization_id,
    integration_id: integration.id,
    source: 'gadgetpoint',
    event_type: 'staff.sso',
    external_id: `gadgetpoint-staff-code:${sourceFingerprint}`,
    entity_type: 'staff_sso',
    entity_id: workflowCodeHash,
    payload: {
      version: 4,
      expires_at: expiresAt.toISOString(),
      staff: {
        external_staff_id: externalStaffId,
        username,
        email,
        external_email: email,
        full_name: fullName,
        role,
        department,
        branch: staff.branch ?? null,
        dashboard_permissions: Array.isArray(staff.dashboard_permissions) ? staff.dashboard_permissions : [],
        workflowos_access_enabled: true,
        workflowos_permissions: workflowPermissions,
        workflowos_identity_kind: 'external_email',
        identity_source: 'gadgetpoint-staff-authorization-code',
      },
    },
    processed_at: now.toISOString(),
  });

  if (eventError) {
    return loginError(request, 'WorkflowOS could not create the one-time staff session handoff.');
  }

  await admin
    .from('external_integrations')
    .update({ status: 'connected', last_synced_at: now.toISOString(), updated_at: now.toISOString() })
    .eq('id', integration.id);

  const destination = new URL('/auth/gadgetpoint', request.url);
  destination.searchParams.set('code', workflowCode);
  const response = NextResponse.redirect(destination, 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
