import { createAdminClient } from '@/lib/supabase/admin';
import type { BridgeEvent } from '@/lib/integrations/bridge';

async function findAssignee(supabase: ReturnType<typeof createAdminClient>, organizationId: string, capability: string) {
  const { data: caps } = await supabase.from('staff_capabilities')
    .select('profile_id,proficiency,profiles!inner(id,active,role)')
    .eq('organization_id', organizationId).eq('capability', capability).eq('active', true)
    .order('proficiency', { ascending: false }).limit(10);
  const match = (caps ?? []).find((c:any) => c.profiles?.active !== false);
  if (match?.profile_id) return match.profile_id as string;
  const { data: fallback } = await supabase.from('profiles').select('id').eq('organization_id',organizationId).eq('active',true).in('role',['owner','admin','manager','staff']).limit(1).maybeSingle();
  return fallback?.id ?? null;
}

function matchesConditions(conditions: any, source: string, event: BridgeEvent) {
  if (!conditions || typeof conditions !== 'object') return true;
  if (conditions.source && conditions.source !== source) return false;
  if (conditions.channel && event.data?.channel !== conditions.channel) return false;
  return true;
}

function titleFrom(rule:any, event:BridgeEvent) {
  const custom = rule.action_config?.title_template;
  if (custom) return String(custom)
    .replaceAll('{{event}}', event.type)
    .replaceAll('{{name}}', String(event.data?.name ?? event.data?.customer_name ?? event.data?.product_interest ?? ''));
  return `WorkflowOS: ${event.type.replaceAll('.',' ')}`;
}

export async function runAutomationsForBridgeEvent(opts:{
  supabase: ReturnType<typeof createAdminClient>;
  organizationId: string;
  source: string;
  event: BridgeEvent;
  sourceEntityId?: string | null;
}) {
  const {data:rules}=await opts.supabase.from('automation_rules').select('*')
    .eq('organization_id',opts.organizationId).eq('active',true).eq('trigger_event',opts.event.type);
  const outcomes:any[]=[];
  for(const rule of rules ?? []){
    if(!matchesConditions(rule.conditions,opts.source,opts.event)) continue;
    const {data:run}=await opts.supabase.from('automation_runs').insert({
      organization_id:opts.organizationId,automation_rule_id:rule.id,trigger_event:opts.event.type,
      source_entity_type:opts.event.type.split('.')[0],source_entity_id:opts.sourceEntityId??opts.event.data?.id?.toString()??null,
      status:'started',input:opts.event
    }).select('id').single();
    try{
      const assignee=await findAssignee(opts.supabase,opts.organizationId,rule.capability||'operations');
      let output:any={};
      if(rule.action_type==='create_task'){
        const {data,error}=await opts.supabase.from('tasks').insert({
          organization_id:opts.organizationId,title:titleFrom(rule,opts.event),
          description:opts.event.data?.message ?? opts.event.data?.description ?? `Automatically created from ${opts.event.type}.`,
          assignee_id:assignee,department:rule.capability||'operations',priority:rule.priority||'medium',
          status:assignee?'assigned':'draft'
        }).select('id,title,assignee_id,status').single(); if(error) throw error; output={task:data};
      } else if(rule.action_type==='create_notification'){
        const {data,error}=await opts.supabase.from('notifications').insert({organization_id:opts.organizationId,recipient_id:assignee,title:titleFrom(rule,opts.event),body:opts.event.data?.message??`Triggered by ${opts.event.type}`,type:'automation'}).select('id').single(); if(error) throw error; output={notification:data};
      } else if(rule.action_type==='create_marketplace_job'){
        const {data,error}=await opts.supabase.from('marketplace_jobs').insert({organization_id:opts.organizationId,job_type:rule.action_config?.job_type??'review_signal',status:'queued',product_ref:opts.event.data?.product_id?.toString()??opts.event.data?.id?.toString()??null,input:opts.event,assigned_to:assignee}).select('id,status').single(); if(error) throw error; output={marketplace_job:data};
      } else if(rule.action_type==='create_lead'){
        const phone=opts.event.data?.phone??opts.event.data?.customer_phone??null;
        const {data,error}=await opts.supabase.from('leads').insert({organization_id:opts.organizationId,name:opts.event.data?.name??opts.event.data?.customer_name??'New lead',phone,email:opts.event.data?.email??opts.event.data?.customer_email??null,source:opts.source,product_interest:opts.event.data?.product_interest??null,status:'new',assigned_to:assignee,notes:opts.event.data?.message??null}).select('id').single(); if(error) throw error; output={lead:data};
      } else {
        output={skipped:true,reason:'Unknown action type'};
      }
      if(run?.id) await opts.supabase.from('automation_runs').update({status:output.skipped?'skipped':'completed',output,finished_at:new Date().toISOString()}).eq('id',run.id);
      await opts.supabase.from('activity_logs').insert({organization_id:opts.organizationId,actor_id:null,action:`automation.${rule.action_type}`,entity_type:'automation_rule',entity_id:rule.id,metadata:{trigger_event:opts.event.type,run_id:run?.id,output}});
      outcomes.push({rule_id:rule.id,ok:true,output});
    }catch(error:any){
      if(run?.id) await opts.supabase.from('automation_runs').update({status:'failed',error_message:error?.message??'Automation failed',finished_at:new Date().toISOString()}).eq('id',run.id);
      outcomes.push({rule_id:rule.id,ok:false,error:error?.message??'Automation failed'});
    }
  }
  return outcomes;
}
