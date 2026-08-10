import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export async function GET() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('growth_recommendations')
    .select('*, profiles:recommended_assignee(full_name,email,role)')
    .eq('organization_id', profile.organization_id)
    .order('score', { ascending: false }).order('created_at', { ascending: false }).limit(100);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ recommendations: data ?? [] });
}
