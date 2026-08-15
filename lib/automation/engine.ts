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

async function findRoleRecipient(supabase: ReturnType<typeof createAdminClient>, organizationId: string, role: string) {
  const allowed = new Set(['owner','admin','manager','marketing','sales','staff']);
  if (!allowed.has(role)) return null;
  const { data } = await supabase.from('profiles').select('id').eq('organization_id',organizationId).eq('active',true).eq('role',role).limit(1).maybeSingle();
  return data?.id ?? null;
}

function inventoryQuantity(event: BridgeEvent) {
  const value = event.data?.stock_quantity ?? event.data?.quantity;
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function matchesConditions(conditions: any, source: string, event: BridgeEvent) {
  if (!conditions || typeof conditions !== 'object') return true;
  if (conditions.source && conditions.source !== source) return false;
  if (conditions.channel && event.data?.channel !== conditions.channel) return false;

  const stock = inventoryQuantity(event);
  if (conditions.stock_quantity_lte !== undefined) {
    const limit = Number(conditions.stock_quantity_lte);
    if (stock === null || !Number.isFinite(limit) || stock > limit) return false;
  }
  if (conditions.stock_quantity_lt !== undefined) {
    const limit = Number(conditions.stock_quantity_lt);
    if (stock === null || !Number.isFinite(limit) || stock >= limit) return false;
  }
  if (conditions.stock_quantity_gte !== undefined) {
    const limit = Number(conditions.stock_quantity_gte);
    if (stock === null || !Number.isFinite(limit) || stock < limit) return false;
  }
  if (conditions.stock_quantity_gt !== undefined) {
    const limit = Number(conditions.stock_quantity_gt);
    if (stock === null || !Number.isFinite(limit) || stock <= limit) return false;
  }
  return true;
}

function applyTemplate(template: string, event: BridgeEvent) {
  return String(template)
    .replaceAll('{{event}}', event.type)
    .replaceAll('{{name}}', String(event.data?.name ?? event.data?.title ?? event.data?.customer_name ?? event.data?.product_interest ?? ''))
    .replaceAll('{{stock_quantity}}', String(event.data?.stock_quantity ?? event.data?.quantity ?? ''))
    .replaceAll('{{sku}}', String(event.data?.sku ?? ''));
}

function titleFrom(rule:any, event:BridgeEvent) {
  const custom = rule.action_config?.title_template;
  if (custom) return applyTemplate(custom, event);
  return `WorkflowOS: ${event.type.replaceAll('.',' ')}`;
}

function descriptionFrom(rule:any, event:BridgeEvent) {
  const custom = rule.action_config?.description_template;
  if (custom) return applyTemplate(custom, event);
  return event.data?.message ?? event.data?.description ?? `Automatically created from ${event.type}.`;
}

async function hasOpenTaskForRuleEntity(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
  ruleId: string,
  sourceEntityId: string
) {
  const { data: runs } = await supabase.from('automation_runs').select('output')
    .eq('organization_id', organizationId)
    .eq('automation_rule_id', ruleId)
    .eq('source_entity_id', sourceEntityId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20);
  const taskIds = (runs ?? []).map((item:any) => item.output?.task?.id).filter(Boolean);
  if (!taskIds.length) return null;
  const { data: task } = await supabase.from('tasks').select('id,title,status')
    .eq('organization_id', organizationId)
    .in('id', taskIds)
    .not('status','in','("completed","approved","cancelled")')
    .limit(1)
    .maybeSingle();
  return task ?? null;
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
    const sourceEntityId=opts.sourceEntityId??opts.event.data?.id?.toString()??null;
    const {data:run,error:runError}=await opts.supabase.from('automation_runs').insert({
      organization_id:opts.organizationId,automation_rule_id:rule.id,trigger_event:opts.event.type,
      source_entity_type:opts.event.type.split('.')[0],source_entity_id:sourceEntityId,
      status:'started',input:opts.event
    }).select('id').single();
    if(runError || !run){
      outcomes.push({rule_id:rule.id,ok:false,error:runError?.message??'Could not start automation run'});
      continue;
    }
    try{
      if(sourceEntityId && rule.action_config?.dedupe_open_task === true && rule.action_type === 'create_task'){
        const openTask=await hasOpenTaskForRuleEntity(opts.supabase,opts.organizationId,rule.id,sourceEntityId);
        if(openTask){
          const output={skipped:true,reason:'An open task already exists for this automation and record',task:openTask};
          await opts.supabase.from('automation_runs').update({status:'skipped',output,finished_at:new Date().toISOString()}).eq('id',run.id);
          outcomes.push({rule_id:rule.id,ok:true,output});
          continue;
        }
      }

      const cooldownMinutes=Number(rule.action_config?.cooldown_minutes??0);
      if(sourceEntityId&&Number.isFinite(cooldownMinutes)&&cooldownMinutes>0){
        const cutoff=new Date(Date.now()-cooldownMinutes*60_000).toISOString();
        const {data:recentRun}=await opts.supabase.from('automation_runs').select('id')
          .eq('organization_id',opts.organizationId).eq('automation_rule_id',rule.id)
          .eq('source_entity_id',sourceEntityId).eq('status','completed').gte('created_at',cutoff)
          .neq('id',run.id).limit(1).maybeSingle();
        if(recentRun){
          const output={skipped:true,reason:`Automation cooldown active for ${cooldownMinutes} minutes`,previous_run_id:recentRun.id};
          await opts.supabase.from('automation_runs').update({status:'skipped',output,finished_at:new Date().toISOString()}).eq('id',run.id);
          outcomes.push({rule_id:rule.id,ok:true,output});
          continue;
        }
      }

      const assignee=await findAssignee(opts.supabase,opts.organizationId,rule.capability||'operations');
      let output:any={};
      if(rule.action_type==='create_task'){
        const {data,error}=await opts.supabase.from('tasks').insert({
          organization_id:opts.organizationId,title:titleFrom(rule,opts.event),
          description:descriptionFrom(rule,opts.event),
          assignee_id:assignee,department:rule.capability||'operations',priority:rule.priority||'medium',
          status:assignee?'assigned':'draft'
        }).select('id,title,assignee_id,status').single(); if(error) throw error; output={task:data};
      } else if(rule.action_type==='create_notification'){
        const requestedRole=String(rule.action_config?.recipient_role??'').trim().toLowerCase();
        const recipient=requestedRole ? await findRoleRecipient(opts.supabase,opts.organizationId,requestedRole) : assignee;
        const {data,error}=await opts.supabase.from('notifications').insert({organization_id:opts.organizationId,recipient_id:recipient,title:titleFrom(rule,opts.event),body:descriptionFrom(rule,opts.event),type:'automation'}).select('id').single(); if(error) throw error; output={notification:data,recipient_id:recipient};
      } else if(rule.action_type==='create_marketplace_job'){
        const {data,error}=await opts.supabase.from('marketplace_jobs').insert({organization_id:opts.organizationId,job_type:rule.action_config?.job_type??'review_signal',status:'queued',product_ref:opts.event.data?.product_id?.toString()??opts.event.data?.id?.toString()??null,input:opts.event,assigned_to:assignee}).select('id,status').single(); if(error) throw error; output={marketplace_job:data};
      } else if(rule.action_type==='create_lead'){
        const phone=opts.event.data?.phone??opts.event.data?.customer_phone??null;
        const {data,error}=await opts.supabase.from('leads').insert({organization_id:opts.organizationId,name:opts.event.data?.name??opts.event.data?.customer_name??'New lead',phone,email:opts.event.data?.email??opts.event.data?.customer_email??null,source:opts.source,product_interest:opts.event.data?.product_interest??null,status:'new',assigned_to:assignee,notes:opts.event.data?.message??null}).select('id').single(); if(error) throw error; output={lead:data};
      } else {
        output={skipped:true,reason:'Unknown action type'};
      }
      await opts.supabase.from('automation_runs').update({status:output.skipped?'skipped':'completed',output,finished_at:new Date().toISOString()}).eq('id',run.id);
      await opts.supabase.from('activity_logs').insert({organization_id:opts.organizationId,actor_id:null,action:`automation.${rule.action_type}`,entity_type:'automation_rule',entity_id:rule.id,metadata:{trigger_event:opts.event.type,run_id:run.id,output}});
      outcomes.push({rule_id:rule.id,ok:true,output});
    }catch(error:any){
      await opts.supabase.from('automation_runs').update({status:'failed',error_message:error?.message??'Automation failed',finished_at:new Date().toISOString()}).eq('id',run.id);
      outcomes.push({rule_id:rule.id,ok:false,error:error?.message??'Automation failed'});
    }
  }
  return outcomes;
}
