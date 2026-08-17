import GadgetPointStaffAccessStatus from '@/components/GadgetPointStaffAccessStatus';
import { requireUser } from '@/lib/auth';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

export default async function GadgetPointStaffAccessStatusSection() {
  const { supabase, user, profile } = await requireUser();
  const { data } = await supabase
    .from('connected_staff')
    .select('external_staff_id,email,full_name,role,department,status,profile_id,metadata,last_synced_at,updated_at')
    .eq('organization_id', profile.organization_id)
    .order('updated_at', { ascending: false });

  const ownerEmail = String(profile.email ?? user.email ?? '').trim().toLowerCase();
  const owner = profile.role === 'owner' && ownerEmail === OWNER_EMAIL;

  return <GadgetPointStaffAccessStatus staff={data ?? []} owner={owner} />;
}
