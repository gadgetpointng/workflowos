import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

const allowed=['task','campaign','marketplace_job','vendor_action','general'];

export async function GET(){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {data,error}=await supabase.from('ai_proposals').select('*').eq('organization_id',profile.organization_id).order('created_at',{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:error.message},{status:400}); return NextResponse.json({items:data??[]});
}

export async function POST(request:Request){
 const {supabase,user,profile}=await requireUser(); if(!user||!profile)return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await request.json().catch(()=>({})); const proposal_type=String(body.proposal_type||'general'); const title=String(body.title||'').trim();
 if(!allowed.includes(proposal_type))return NextResponse.json({error:'Invalid proposal_type'},{status:400}); if(!title)return NextResponse.json({error:'title is required'},{status:400});
 const payload=typeof body.payload==='object'&&body.payload?body.payload:{};
 const {data,error}=await supabase.from('ai_proposals').insert({organization_id:profile.organization_id,created_by:user.id,proposal_type,title,summary:String(body.summary||''),payload,status:'pending_approval'}).select('*').single();
 if(error)return NextResponse.json({error:error.message},{status:400});
 await supabase.from('activity_logs').insert({organization_id:profile.organization_id,user_id:user.id,action:'ai.proposal.created',entity_type:'ai_proposal',entity_id:data.id,metadata:{proposal_type,title}}).catch(()=>null);
 return NextResponse.json({item:data},{status:201});
}
