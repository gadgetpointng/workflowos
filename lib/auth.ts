import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { gadgetPointStaffAccessFromMetadata, isGadgetPointStaffAppMetadata } from '@/lib/workflow-access';

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) return { supabase, user, profile: null };
  const appMetadata = user.app_metadata as Record<string, unknown>;
  const isGadgetPointStaff = isGadgetPointStaffAppMetadata(appMetadata);
  const staffAccess = gadgetPointStaffAccessFromMetadata(appMetadata);
  return {
    supabase,
    user,
    profile: {
      ...profile,
      workflowos_identity_source: isGadgetPointStaff ? 'gadgetpoint-staff-authorization-code' : null,
      workflowos_access_enabled: isGadgetPointStaff ? staffAccess.enabled : true,
      workflowos_permissions: isGadgetPointStaff ? staffAccess.permissions : [],
    },
  };
});

export function canManage(role?: string | null) {
  return ['owner','admin','manager'].includes(role ?? '');
}
