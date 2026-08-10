'use client';
import { FormEvent, useState } from 'react';

type Person={id:string;full_name:string;email?:string|null};
export default function CapabilityManager({people}:{people:Person[]}){
 const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMsg('');const f=new FormData(e.currentTarget);const r=await fetch('/api/staff-capabilities',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profile_id:f.get('profile_id'),capability:f.get('capability'),proficiency:Number(f.get('proficiency'))})});const j=await r.json().catch(()=>({}));setBusy(false);if(!r.ok)return setMsg(j.error||'Could not save');setMsg('Capability saved');location.reload();}
 return <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-[1.4fr_1fr_.6fr_auto] md:items-end">
  <label className="text-sm"><span className="mb-1 block font-medium">Staff member</span><select name="profile_id" required className="w-full rounded-xl border bg-white px-3 py-2">{people.map(p=><option key={p.id} value={p.id}>{p.full_name}{p.email?` · ${p.email}`:''}</option>)}</select></label>
  <label className="text-sm"><span className="mb-1 block font-medium">Capability</span><select name="capability" className="w-full rounded-xl border bg-white px-3 py-2"><option>sales</option><option>marketing</option><option>marketplace</option><option>inventory</option><option>operations</option><option>customer-support</option></select></label>
  <label className="text-sm"><span className="mb-1 block font-medium">Proficiency</span><select name="proficiency" className="w-full rounded-xl border bg-white px-3 py-2">{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label>
  <button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
  {msg&&<div className="text-xs text-slate-500 md:col-span-4">{msg}</div>}
 </form>
}
