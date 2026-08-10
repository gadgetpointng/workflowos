import { NextResponse } from 'next/server';
import { canManage,requireUser } from '@/lib/auth';

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params; const {supabase,user,profile}=await requireUser(); if(!user||!profile)return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await request.json().catch(()=>({})); const action=String(body.action||'');
 const {data:proposal,error:readError}=await supabase.from('ai_proposals').select('*').eq('id',id).eq('organization_id',profile.organization_id).single();
 if(readError||!proposal)return NextResponse.json({error:'Proposal not found'},{status:404});
 if(!canManage(profile.role))return NextResponse.json({error:'Manager permission required'},{status:403});
 if(action==='approve'||action==='reject'){
  const status=action==='approve'?'approved':'rejected'; const update:any={status,updated_at:new Date().toISOString()}; if(action==='approve'){update.approved_by=user.id;update.approved_at=new Date().toISOString();}
  const {error}=await supabase.from('ai_proposals').update(update).eq('id',id).eq('organization_id',profile.organization_id); if(error)return NextResponse.json({error:error.message},{status:400});
  await supabase.from('activity_logs').insert({organization_id:profile.organization_id,user_id:user.id,action:`ai.proposal.${status}`,entity_type:'ai_proposal',entity_id:id,metadata:{proposal_type:proposal.proposal_type,title:proposal.title}}).catch(()=>null);
  return NextResponse.json({ok:true,status});
 }
 if(action==='execute'){
  if(proposal.status!=='approved')return NextResponse.json({error:'Proposal must be approved before execution'},{status:409});
  let created:any=null; const p=proposal.payload||{};
  if(proposal.proposal_type==='task'){
   const {data,error}=await supabase.from('tasks').insert({organization_id:profile.organization_id,title:String(p.title||proposal.title),description:String(p.description||proposal.summary||''),creator_id:user.id,assignee_id:p.assignee_id||null,department:p.department||null,priority:['low','medium','high','urgent'].includes(p.priority)?p.priority:'medium',status:'assigned',due_at:p.due_at||null}).select('id,title').single(); if(error)return NextResponse.json({error:error.message},{status:400}); created={type:'task',...data};
  } else if(proposal.proposal_type==='campaign'){
   const {data,error}=await supabase.from('campaigns').insert({organization_id:profile.organization_id,name:String(p.name||proposal.title),objective:String(p.objective||proposal.summary||''),target_audience:p.target_audience||null,status:'draft',budget:p.budget||null,starts_at:p.starts_at||null,ends_at:p.ends_at||null,owner_id:user.id}).select('id,name').single(); if(error)return NextResponse.json({error:error.message},{status:400}); created={type:'campaign',...data};
  } else if(proposal.proposal_type==='marketplace_job'){
   const {data,error}=await supabase.from('marketplace_jobs').insert({organization_id:profile.organization_id,marketplace_id:p.marketplace_id||null,connection_id:p.connection_id||null,job_type:String(p.job_type||'manual_review'),product_ref:p.product_ref||null,input:p.input||p,requested_by:user.id,status:'queued'}).select('id,job_type').single(); if(error)return NextResponse.json({error:error.message},{status:400}); created={type:'marketplace_job',...data};
  } else {
   return NextResponse.json({error:'This proposal type requires manual execution for now.'},{status:409});
  }
  const now=new Date().toISOString(); await supabase.from('ai_proposals').update({status:'executed',executed_at:now,updated_at:now}).eq('id',id).eq('organization_id',profile.organization_id);
  await supabase.from('activity_logs').insert({organization_id:profile.organization_id,user_id:user.id,action:'ai.proposal.executed',entity_type:'ai_proposal',entity_id:id,metadata:{proposal_type:proposal.proposal_type,title:proposal.title,created}}).catch(()=>null);
  return NextResponse.json({ok:true,status:'executed',created});
 }
 return NextResponse.json({error:'Unknown action'},{status:400});
}
