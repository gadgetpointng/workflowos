'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';
export default function BuyerIntentActions({id,leadId,canContact}:{id:string;leadId?:string|null;canContact:boolean}){const router=useRouter();const [busy,setBusy]=useState('');
 async function act(action:string){setBusy(action);const r=await fetch('/api/buyer-intents',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,action})});setBusy('');if(r.ok)router.refresh();}
 return <div className="flex flex-wrap gap-2">
  <button className="secondary-button" disabled={Boolean(busy)} onClick={()=>act('refresh_match')}>{busy==='refresh_match'?'Matching…':'Match products'}</button>
  {!leadId&&canContact&&<button className="primary-button" disabled={Boolean(busy)} onClick={()=>act('convert_to_lead')}>{busy==='convert_to_lead'?'Converting…':'Create sales lead'}</button>}
  <button className="secondary-button" disabled={Boolean(busy)} onClick={()=>act('close')}>Close</button>
 </div>}
