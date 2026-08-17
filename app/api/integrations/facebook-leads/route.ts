import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { facebookLeadEnvStatus } from '@/lib/integrations/facebook-leads';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
function isOwner(profile: any, user: any) {
  const email = String(profile?.email ?? user?.email ?? '').trim().toLowerCase();
  return profile?.role === 'owner' && email === OWNER_EMAIL;
}

function graphRuntimeReady(env: ReturnType<typeof facebookLeadEnvStatus>) {
  return env.appSecret && env.pageAccessToken && env.graphVersion;
}

function newWebhookVerifyToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export async function GET(request: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  const [{ data: integration }, { data: staff }, { data: events }] = await Promise.all([
    admin.from('external_integrations').select('id,status,external_account_ref,settings,last_synced_at,updated_at').eq('organization_id', profile.organization_id).eq('slug', 'facebook-leads').maybeSingle(),
    admin.from('profiles').select('id,full_name,email,role').eq('organization_id', profile.organization_id).eq('active', true).order('full_name', { ascending: true }),
    admin.from('facebook_lead_events').select('status,received_at').eq('organization_id', profile.organization_id).order('received_at', { ascending: false }).limit(100),
  ]);
  const canManage = isOwner(profile, user);
  const env = facebookLeadEnvStatus();
  const storedVerifyToken = String(integration?.settings?.webhook_verify_token ?? '').trim();
  const verifyTokenConfigured = Boolean(storedVerifyToken || env.verifyToken);
  const counts = (events ?? []).reduce((acc: Record<string, number>, event: any) => {
    acc[event.status] = (acc[event.status] ?? 0) + 1;
    return acc;
  }, {});
  const integrationActive = Boolean(integration && !['disabled', 'disconnected'].includes(integration.status));
  const webhookUrl = new URL('/api/integrations/facebook-leads/webhook', request.url);
  webhookUrl.searchParams.set('workspace', profile.organization_id);
  return NextResponse.json({
    ok: true,
    canManage,
    ready: graphRuntimeReady(env) && verifyTokenConfigured && integrationActive,
    env: { ...env, verifyToken: verifyTokenConfigured },
    verifyToken: canManage && storedVerifyToken ? storedVerifyToken : '',
    verifyTokenSource: storedVerifyToken ? 'workspace' : env.verifyToken ? 'environment' : 'missing',
    webhookUrl: webhookUrl.toString(),
    integration: integration ? {
      pageId: integration.external_account_ref,
      pageName: integration.settings?.page_name ?? '',
      defaultAssigneeId: integration.settings?.default_assignee_id ?? '',
      followupMinutes: integration.settings?.followup_minutes ?? 15,
      status: integration.status,
      lastSyncedAt: integration.last_synced_at,
    } : null,
    staff: staff ?? [],
    eventCounts: counts,
  });
}

export async function POST(request: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile || !isOwner(profile, user)) return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const pageId = String(body.pageId ?? '').trim();
  const pageName = String(body.pageName ?? '').trim().slice(0, 120);
  const defaultAssigneeId = String(body.defaultAssigneeId ?? '').trim() || null;
  const followupMinutesRaw = Number(body.followupMinutes ?? 15);
  const followupMinutes = Number.isFinite(followupMinutesRaw) ? Math.min(Math.max(Math.round(followupMinutesRaw), 1), 10080) : 15;
  const rotateVerifyToken = body.rotateVerifyToken === true;
  if (!pageId) return NextResponse.json({ error: 'Facebook Page ID is required' }, { status: 400 });

  const admin = createAdminClient();
  if (defaultAssigneeId) {
    const { data: assignee } = await admin.from('profiles').select('id').eq('organization_id', profile.organization_id).eq('id', defaultAssigneeId).eq('active', true).maybeSingle();
    if (!assignee) return NextResponse.json({ error: 'Default assignee is not an active team member' }, { status: 400 });
  }

  const { data: existing } = await admin
    .from('external_integrations')
    .select('settings')
    .eq('organization_id', profile.organization_id)
    .eq('slug', 'facebook-leads')
    .maybeSingle();

  const currentSettings = (existing?.settings ?? {}) as Record<string, unknown>;
  const currentToken = String(currentSettings.webhook_verify_token ?? '').trim();
  const webhookVerifyToken = rotateVerifyToken || !currentToken ? newWebhookVerifyToken() : currentToken;
  const env = facebookLeadEnvStatus();
  const now = new Date().toISOString();
  const status = graphRuntimeReady(env) ? 'connected' : 'pending';
  const { data, error } = await admin.from('external_integrations').upsert({
    organization_id: profile.organization_id,
    name: 'Facebook Leads',
    slug: 'facebook-leads',
    kind: 'custom',
    status,
    base_url: 'https://graph.facebook.com',
    external_account_ref: pageId,
    capabilities: ['meta.lead', 'facebook.lead_ads'],
    settings: {
      ...currentSettings,
      page_name: pageName || null,
      default_assignee_id: defaultAssigneeId,
      followup_minutes: followupMinutes,
      webhook_verify_token: webhookVerifyToken,
    },
    updated_at: now,
  }, { onConflict: 'organization_id,slug' }).select('id,status,external_account_ref,settings,last_synced_at').single();
  if (error || !data) return NextResponse.json({ error: error?.message || 'Could not save Facebook integration' }, { status: 400 });
  return NextResponse.json({
    ok: true,
    integration: data,
    ready: status === 'connected',
    verifyToken: webhookVerifyToken,
  });
}
