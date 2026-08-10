'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CampaignQuickCreate(){
 const router=useRouter(); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMsg('');const fd=new FormData(e.currentTarget);const body:any={name:fd.get('name'),objective:fd.get('objective')||null,target_audience:fd.get('target_audience')||null,status:fd.get('status')||'draft',budget:fd.get('budget')?Number(fd.get('budget')):null,starts_at:fd.get('starts_at')||null,ends_at:fd.get('ends_at')||null};const r=await fetch('/api/campaigns',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){setMsg(j.error||'Could not create campaign');return;}e.currentTarget.reset();setMsg('Campaign created');router.refresh();}
 return <form onSubmit={submit} className="quick-grid">
  <input name="name" required placeholder="Campaign name" className="app-input"/>
  <input name="objective" placeholder="Objective" className="app-input"/>
  <input name="target_audience" placeholder="Target audience" className="app-input"/>
  <select name="status" className="app-input"><option value="draft">Draft</option><option value="planned">Planned</option><option value="active">Active</option></select>
  <input name="budget" type="number" min="0" step="0.01" placeholder="Budget" className="app-input"/>
  <input name="starts_at" type="datetime-local" className="app-input"/>
  <input name="ends_at" type="datetime-local" className="app-input"/>
  <button disabled={busy} className="primary-button">{busy?'Creating…':'Create campaign'}</button>
  {msg&&<div className="form-note">{msg}</div>}
 </form>
}
