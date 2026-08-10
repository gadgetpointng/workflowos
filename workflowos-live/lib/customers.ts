export async function resolveCustomer(supabase:any, organizationId:string, input:{name?:string|null;phone?:string|null;email?:string|null;source?:string|null;lifecycle?:string|null}){
  const phone=input.phone?String(input.phone).trim():null; const email=input.email?String(input.email).trim().toLowerCase():null;
  let customer:any=null;
  if(phone){ const r=await supabase.from('customers').select('*').eq('organization_id',organizationId).eq('phone',phone).maybeSingle(); customer=r.data; }
  if(!customer&&email){ const r=await supabase.from('customers').select('*').eq('organization_id',organizationId).ilike('email',email).maybeSingle(); customer=r.data; }
  const now=new Date().toISOString();
  if(customer){ const patch:any={updated_at:now,last_seen_at:now}; if(input.name&&!customer.name)patch.name=input.name;if(phone&&!customer.phone)patch.phone=phone;if(email&&!customer.email)patch.email=email;if(input.source&&!customer.primary_source)patch.primary_source=input.source;if(input.lifecycle==='customer'&&customer.lifecycle==='prospect')patch.lifecycle='customer';const r=await supabase.from('customers').update(patch).eq('id',customer.id).select().single();return r.data||customer; }
  const r=await supabase.from('customers').insert({organization_id:organizationId,name:input.name||null,phone,email,lifecycle:input.lifecycle||'prospect',primary_source:input.source||null,last_seen_at:now}).select().single();
  if(r.error) throw r.error; return r.data;
}

export async function refreshCustomerCommerce(supabase:any, customerId:string){
  const {data:orders}=await supabase.from('connected_orders').select('total_amount,ordered_at,status').eq('customer_id',customerId);
  const valid=(orders||[]).filter((o:any)=>!['cancelled','refunded'].includes(String(o.status||'').toLowerCase()));
  const total=valid.reduce((sum:number,o:any)=>sum+Number(o.total_amount||0),0); const count=valid.length; const last=valid.map((o:any)=>o.ordered_at).filter(Boolean).sort().at(-1)||null;
  const lifecycle=count>=5||total>=1000000?'vip':count>=2?'repeat':count>=1?'customer':'prospect';
  await supabase.from('customers').update({total_orders:count,total_spend:total,last_order_at:last,lifecycle,updated_at:new Date().toISOString()}).eq('id',customerId);
}
