import { NextResponse } from 'next/server';
import { requireUser, canManage } from '@/lib/auth';
import { executeConnectorJob } from '@/lib/marketplaces/connectors/base';

export async function POST() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage(profile.role) && profile.role !== 'marketing') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data: jobs, error } = await supabase.from('marketplace_jobs').select('*,marketplaces(slug)').eq('organization_id', profile.organization_id).eq('status', 'queued').order('created_at').limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  let processed = 0;
  for (const job of jobs ?? []) {
    await supabase.from('marketplace_jobs').update({ status: 'running', started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', job.id);
    const { data: run } = await supabase.from('connector_worker_runs').insert({ organization_id: profile.organization_id, marketplace_job_id: job.id, connector_slug: job.marketplaces?.slug ?? 'unknown', request_payload: job.input ?? {} }).select().single();
    try {
      const result = await executeConnectorJob(job);
      await supabase.from('marketplace_jobs').update({ status: result.status, output: result.output ?? {}, error_message: result.error ?? null, completed_at: result.status === 'completed' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', job.id);
      if (run) await supabase.from('connector_worker_runs').update({ status: result.status, response_payload: result.output ?? {}, error_message: result.error ?? null, finished_at: new Date().toISOString() }).eq('id', run.id);
      processed++;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Worker failed';
      await supabase.from('marketplace_jobs').update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() }).eq('id', job.id);
      if (run) await supabase.from('connector_worker_runs').update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() }).eq('id', run.id);
    }
  }
  return NextResponse.json({ ok: true, processed });
}
