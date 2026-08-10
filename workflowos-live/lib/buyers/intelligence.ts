export type BuyerIntentInput = {
  product_query?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  state?: string | null;
  city?: string | null;
  urgency?: string | null;
  source?: string | null;
  consent_status?: string | null;
};

const norm=(v?:string|null)=>(v??'').trim().toLowerCase();

export function scoreBuyerIntent(input:BuyerIntentInput){
  let score=25;
  if(input.product_query) score+=15;
  if(input.brand) score+=8;
  if(input.model) score+=10;
  if(input.budget_max || input.budget_min) score+=12;
  if(input.city || input.state) score+=8;
  if(input.urgency==='high') score+=10;
  if(input.urgency==='immediate') score+=18;
  if(input.consent_status==='opted_in') score+=8;
  if(input.consent_status==='do_not_contact') score=0;
  return Math.max(0,Math.min(100,score));
}

export function canContactBuyer(consent?:string|null){
  return consent==='opted_in';
}

export function matchProducts(intent:BuyerIntentInput, products:any[], limit=6){
  const query=norm([intent.product_query,intent.brand,intent.model,intent.category].filter(Boolean).join(' '));
  const tokens=query.split(/\s+/).filter(t=>t.length>1);
  const maxBudget=Number(intent.budget_max||0);
  return (products??[]).map((p:any)=>{
    const hay=norm([p.name,p.category,p.sku,p.metadata?.brand,p.metadata?.model].filter(Boolean).join(' '));
    let score=0;
    for(const token of tokens) if(hay.includes(token)) score+=12;
    if(intent.brand && hay.includes(norm(intent.brand))) score+=18;
    if(intent.model && hay.includes(norm(intent.model))) score+=22;
    if(intent.category && hay.includes(norm(intent.category))) score+=10;
    const price=Number(p.price||0);
    if(maxBudget>0 && price>0){
      if(price<=maxBudget) score+=15;
      else if(price<=maxBudget*1.1) score+=5;
      else score-=15;
    }
    if(Number(p.stock_quantity||0)>0) score+=8;
    if(p.active===false) score-=50;
    return {id:p.id,external_product_id:p.external_product_id,name:p.name,category:p.category,price:p.price,stock_quantity:p.stock_quantity,score};
  }).filter((p:any)=>p.score>0).sort((a:any,b:any)=>b.score-a.score).slice(0,limit);
}
