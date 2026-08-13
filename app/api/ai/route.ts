import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireUser } from '@/lib/auth';

const routeGuide = [
  ['/dashboard','overview and business health'],['/today','today priorities'],['/tasks','tasks'],['/acquisition','buyer acquisition links'],['/buyers','buyer intelligence'],['/buyers/radar','buyer radar'],['/leads','leads'],['/customers','customers'],['/campaigns','campaigns'],['/catalog','catalog'],['/integrations','connections'],['/automations','automations'],['/analytics','analytics'],['/team','team'],['/settings','settings'],['/ai','AI assistant'],
];

function aiClient() {
  const directKey = process.env.OPENAI_API_KEY;
  if (directKey) {
    return {
      client: new OpenAI({ apiKey: directKey }),
      model: process.env.OPENAI_MODEL || 'gpt-5',
      provider: 'openai',
    };
  }

  const gatewayAuth = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (gatewayAuth) {
    return {
      client: new OpenAI({ apiKey: gatewayAuth, baseURL: 'https://ai-gateway.vercel.sh/v1' }),
      model: process.env.AI_GATEWAY_MODEL || 'openai/gpt-5.6-sol',
      provider: process.env.AI_GATEWAY_API_KEY ? 'vercel-ai-gateway-key' : 'vercel-ai-gateway-oidc',
    };
  }

  return null;
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ai = aiClient();
  if (!ai) return NextResponse.json({ error: 'Copilot is not configured on this deployment.' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt || '').trim();
  if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  if (prompt.length > 4000) return NextResponse.json({ error: 'Prompt is too long.' }, { status: 400 });

  const org = profile.organization_id;
  const now = new Date();
  const [tasks,leads,recs,orders,signals,campaigns,goals,vendors,buyers,integrations] = await Promise.all([
    supabase.from('tasks').select('title,status,priority,due_at').eq('organization_id',org).not('status','in','("completed","approved","cancelled")').order('due_at',{ascending:true}).limit(20),
    supabase.from('leads').select('name,source,status,product_interest,next_followup_at').eq('organization_id',org).not('status','in','("purchased","lost")').order('next_followup_at',{ascending:true}).limit(20),
    supabase.from('growth_recommendations').select('title,rationale,score,recommendation_type,status').eq('organization_id',org).in('status',['new','accepted']).order('score',{ascending:false}).limit(12),
    supabase.from('connected_orders').select('total_amount,currency,channel,status,ordered_at').eq('organization_id',org).order('ordered_at',{ascending:false}).limit(15),
    supabase.from('commerce_signals').select('source,signal_type,product_ref,search_query,value,observed_at').eq('organization_id',org).order('observed_at',{ascending:false}).limit(20),
    supabase.from('campaigns').select('name,status,objective,starts_at,ends_at,budget').eq('organization_id',org).order('created_at',{ascending:false}).limit(10),
    supabase.from('goals').select('title,metric,target_value,current_value,status,due_at').eq('organization_id',org).in('status',['active','at_risk']).limit(10),
    supabase.from('vendors').select('name,status,commission_rate').eq('organization_id',org).limit(10),
    supabase.from('buyer_intents').select('source,product_query,city,state,intent_score,status,consent_status,observed_at').eq('organization_id',org).neq('status','ignored').order('observed_at',{ascending:false}).limit(30),
    supabase.from('external_integrations').select('name,slug,kind,status,capabilities,last_synced_at').eq('organization_id',org).limit(20),
  ]);

  const context = {
    generated_at: now.toISOString(),
    tasks: tasks.data ?? [], leads: leads.data ?? [], recommendations: recs.data ?? [], recent_orders: orders.data ?? [],
    demand_signals: signals.data ?? [], campaigns: campaigns.data ?? [], goals: goals.data ?? [], vendors: vendors.data ?? [],
    buyer_intents: buyers.data ?? [], integrations: integrations.data ?? [], route_guide: routeGuide,
  };

  try {
    const response = await ai.client.responses.create({
      model: ai.model,
      input: [
        { role: 'system', content: `You are WorkflowOS Operating Copilot. Use only supplied workspace data for business facts. Be concise, practical and action-oriented. When a recommendation belongs to a WorkflowOS function, name the exact internal route from route_guide, for example "Open /acquisition" or "Open /buyers". Never invent a connection status, buyer, order, inventory number, message, campaign result or completed action. Never claim an action ran unless the supplied context proves it. If an outside platform connection is not present in integrations, say it still needs an approved connection and direct the owner to /integrations. Do not request confidential connection credentials in chat. Prefer this order: urgent work, buyer/revenue opportunities, follow-up, system health, then longer-term ideas.` },
        { role: 'user', content: `Workspace context:\n${JSON.stringify(context)}\n\nUser request: ${prompt}` },
      ],
    });

    await supabase.from('activity_logs').insert({
      organization_id: org,
      actor_id: user.id,
      action: 'ai.copilot.query',
      entity_type: 'ai',
      metadata: { prompt: prompt.slice(0,500), provider: ai.provider, model: ai.model },
    });

    return NextResponse.json({ output: response.output_text, provider: ai.provider });
  } catch (error: any) {
    await supabase.from('activity_logs').insert({
      organization_id: org,
      actor_id: user.id,
      action: 'ai.copilot.failed',
      entity_type: 'ai',
      metadata: { provider: ai.provider, model: ai.model, error: String(error?.message || 'Copilot request failed').slice(0,500) },
    });
    return NextResponse.json({ error: 'Copilot could not complete this request. Please try again.' }, { status: 502 });
  }
}
