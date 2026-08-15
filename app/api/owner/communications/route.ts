import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

type OwnerControls = {
  teamFeed: boolean;
  privateMessages: boolean;
  readReceipts: boolean;
  messageRetraction: boolean;
};

function isOwner(profile: any, user: any) {
  const email = String(profile?.email ?? user?.email ?? '').trim().toLowerCase();
  return profile?.role === 'owner' && email === OWNER_EMAIL;
}

async function getOwnerControls(supabase: any, organizationId: string): Promise<OwnerControls> {
  const { data } = await supabase
    .from('organization_settings')
    .select('metadata')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const stored = data?.metadata?.owner_controls ?? {};
  return {
    teamFeed: stored.teamFeed !== false,
    privateMessages: stored.privateMessages !== false,
    readReceipts: stored.readReceipts !== false,
    messageRetraction: stored.messageRetraction !== false,
  };
}

export async function GET() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile || !isOwner(profile, user)) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const controls = await getOwnerControls(supabase, profile.organization_id);
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,email,role')
    .eq('organization_id', profile.organization_id)
    .eq('active', true)
    .neq('id', user.id)
    .order('full_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, controls, staff: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile || !isOwner(profile, user)) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const mode = body.mode === 'private' ? 'private' : 'broadcast';
  const title = String(body.title ?? '').trim().slice(0, 140);
  const message = String(body.message ?? '').trim().slice(0, 4000);
  const recipientId = String(body.recipientId ?? '').trim();
  const controls = await getOwnerControls(supabase, profile.organization_id);

  if (mode === 'broadcast' && !controls.teamFeed) {
    return NextResponse.json({ error: 'Team feed is switched Off in Owner Control' }, { status: 403 });
  }
  if (mode === 'private' && !controls.privateMessages) {
    return NextResponse.json({ error: 'Private staff messages are switched Off in Owner Control' }, { status: 403 });
  }
  if (!title || !message) {
    return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
  }

  let recipients: { id: string; full_name?: string | null }[] = [];
  if (mode === 'private') {
    if (!recipientId) return NextResponse.json({ error: 'Choose a staff member' }, { status: 400 });
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name')
      .eq('organization_id', profile.organization_id)
      .eq('id', recipientId)
      .eq('active', true)
      .neq('id', user.id)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    recipients = [data];
  } else {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name')
      .eq('organization_id', profile.organization_id)
      .eq('active', true)
      .neq('id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    recipients = data ?? [];
  }

  if (!recipients.length) return NextResponse.json({ error: 'No active staff recipients found' }, { status: 400 });

  const notificationRows = recipients.map((recipient) => ({
    organization_id: profile.organization_id,
    recipient_id: recipient.id,
    title,
    body: message,
    type: mode === 'private' ? 'owner_private_message' : 'owner_feed',
  }));

  const { data: created, error: insertError } = await supabase
    .from('notifications')
    .insert(notificationRows)
    .select('id,recipient_id,created_at');

  if (insertError || !created) {
    return NextResponse.json({ error: insertError?.message || 'Could not send message' }, { status: 400 });
  }

  const { data: action, error: logError } = await supabase
    .from('activity_logs')
    .insert({
      organization_id: profile.organization_id,
      actor_id: user.id,
      action: 'owner.communication.sent',
      entity_type: 'notification_batch',
      metadata: {
        mode,
        title,
        message,
        notification_ids: created.map((item: any) => item.id),
        recipient_ids: recipients.map((item) => item.id),
        recipient_names: recipients.map((item) => item.full_name || 'Staff'),
      },
    })
    .select('id,created_at')
    .single();

  if (logError || !action) {
    await supabase.from('notifications').delete().in('id', created.map((item: any) => item.id));
    return NextResponse.json({ error: logError?.message || 'Could not record owner action' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, actionId: action.id, recipients: recipients.length, mode });
}

export async function DELETE(request: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile || !isOwner(profile, user)) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const controls = await getOwnerControls(supabase, profile.organization_id);
  if (!controls.messageRetraction) {
    return NextResponse.json({ error: 'Message retraction is switched Off in Owner Control' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const actionId = String(body.actionId ?? '').trim();
  if (!actionId) return NextResponse.json({ error: 'Missing action id' }, { status: 400 });

  const { data: action, error } = await supabase
    .from('activity_logs')
    .select('id,metadata,created_at')
    .eq('id', actionId)
    .eq('organization_id', profile.organization_id)
    .eq('actor_id', user.id)
    .eq('action', 'owner.communication.sent')
    .maybeSingle();

  if (error || !action) {
    return NextResponse.json({ error: 'Send action not found or already unavailable' }, { status: 404 });
  }

  const { data: existingRetraction } = await supabase
    .from('activity_logs')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('actor_id', user.id)
    .eq('action', 'owner.communication.retracted')
    .contains('metadata', { original_action_id: action.id })
    .maybeSingle();

  if (existingRetraction) return NextResponse.json({ error: 'This message has already been retracted' }, { status: 409 });

  const ids = Array.isArray(action.metadata?.notification_ids)
    ? action.metadata.notification_ids.map((value: unknown) => String(value)).filter(Boolean)
    : [];

  if (ids.length) {
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('organization_id', profile.organization_id)
      .in('id', ids);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  const { error: retractLogError } = await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    actor_id: user.id,
    action: 'owner.communication.retracted',
    entity_type: 'notification_batch',
    metadata: { original_action_id: action.id, notification_ids: ids, original: action.metadata ?? {} },
  });

  if (retractLogError) return NextResponse.json({ error: retractLogError.message }, { status: 400 });
  return NextResponse.json({ ok: true, retracted: ids.length });
}
