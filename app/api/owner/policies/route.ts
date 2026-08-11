import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

const ALLOWED_POLICIES = new Set([
  'teamFeed',
  'privateMessages',
  'readReceipts',
  'messageRetraction',
]);

function isOwner(profile: any, user: any) {
  const email = String(profile?.email ?? user?.email ?? '').trim().toLowerCase();
  return String(profile?.role || '').toLowerCase() === 'owner' && email === OWNER_EMAIL;
}

export async function PATCH(request: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile || !isOwner(profile, user)) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const key = String(body.key ?? '').trim();
  const enabled = body.enabled;

  if (!ALLOWED_POLICIES.has(key) || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid owner control' }, { status: 400 });
  }

  const { data: current, error: readError } = await supabase
    .from('organization_settings')
    .select('metadata')
    .eq('organization_id', profile.organization_id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 400 });
  }

  const metadata = current?.metadata && typeof current.metadata === 'object' ? current.metadata : {};
  const ownerControls = metadata.owner_controls && typeof metadata.owner_controls === 'object'
    ? metadata.owner_controls
    : {};

  const nextMetadata = {
    ...metadata,
    owner_controls: {
      ...ownerControls,
      [key]: enabled,
    },
  };

  const { error: writeError } = await supabase
    .from('organization_settings')
    .upsert(
      {
        organization_id: profile.organization_id,
        metadata: nextMetadata,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    );

  if (writeError) {
    return NextResponse.json({ error: writeError.message }, { status: 400 });
  }

  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    actor_id: user.id,
    action: 'owner.policy.changed',
    entity_type: 'organization_settings',
    metadata: { key, enabled },
  });

  return NextResponse.json({ ok: true, key, enabled });
}
