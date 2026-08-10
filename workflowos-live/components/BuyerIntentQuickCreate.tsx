'use client';
import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
export default function BuyerIntentQuickCreate(){
 const router=useRouter(); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMsg('');const fd=new FormData(e.currentTarget);const body=Object.fromEntries(fd.entries());
  const r=await fetch('/api/buyer-intents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){setMsg(j.error||'Could not capture buyer intent');return;} (e.target as HTMLFormElement).reset();setMsg('Buyer intent captured');router.refresh();}
 return <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
  <input name="product_query" required placeholder="What does the buyer want?" className="field xl:col-span-2"/>
  <input name="budget_max" type="number" min="0" step="1" placeholder="Max budget (₦)" className="field"/>
  <select name="urgency" className="field"><option value="normal">Normal urgency</option><option value="high">High</option><option value="immediate">Immediate</option><option value="low">Low</option></select>
  <input name="buyer_name" placeholder="Buyer name (optional)" className="field"/>
  <input name="phone" placeholder="Phone / WhatsApp" className="field"/>
  <input name="city" placeholder="City e.g. Enugu" className="field"/>
  <input name="state" placeholder="State e.g. Enugu" className="field"/>
  <select name="source" defaultValue="manual" className="field"><option value="manual">Manual</option><option value="walk_in">Walk-in</option><option value="whatsapp">WhatsApp</option><option value="storefront">GadgetPoint storefront</option><option value="facebook">Facebook / Instagram</option><option value="facebook_marketplace">Facebook Marketplace</option><option value="tiktok">TikTok</option><option value="jumia">Jumia</option><option value="jiji">Jiji</option><option value="konga">Konga</option></select>
  <select name="consent_status" className="field"><option value="unknown">Contact consent unknown</option><option value="opted_in">Opted in</option><option value="public_signal">Public demand signal only</option><option value="do_not_contact">Do not contact</option></select>
  <input name="brand" placeholder="Brand" className="field"/>
  <input name="model" placeholder="Model" className="field"/>
  <div className="xl:col-span-4 flex items-center gap-3"><button disabled={busy} className="primary-button">{busy?'Capturing…':'Capture buyer demand'}</button>{msg&&<span className="text-sm text-slate-500">{msg}</span>}</div>
 </form>
}
