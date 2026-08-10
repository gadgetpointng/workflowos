export type BuyerActionInput={intent_score?:number|null;urgency?:string|null;consent_status?:string|null;matched_products?:any[]|null;lead_id?:string|null;status?:string|null;city?:string|null;state?:string|null};
export function buyerNextAction(x:BuyerActionInput){
 const score=Number(x.intent_score||0), matches=Array.isArray(x.matched_products)?x.matched_products:[];
 if(x.status==='closed'||x.status==='ignored') return {key:'done',label:'No action',reason:'Opportunity is closed.',priority:0};
 if(!matches.length) return {key:'match',label:'Match products',reason:'Find an available GadgetPoint product that fits this demand.',priority:score+10};
 if(x.consent_status!=='opted_in') return {key:'observe',label:'Use as demand signal',reason:'No outreach consent. Keep this signal for demand intelligence only.',priority:score};
 if(!x.lead_id) return {key:'lead',label:'Create sales lead',reason:'Buyer opted in and a product match is available.',priority:score+20};
 if(x.urgency==='immediate'||x.urgency==='high') return {key:'contact',label:'Contact now',reason:'High-intent buyer already has a sales lead.',priority:score+30};
 return {key:'followup',label:'Follow up',reason:'Keep the qualified buyer moving toward a sale.',priority:score+15};
}
