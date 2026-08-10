'use client';
import { useState } from 'react';

export default function RecommendationActions({ id, hasTask }: { id:string; hasTask:boolean }) {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  async function act(status:'accepted'|'dismissed'|'completed', createTask=false) {
    setBusy(true); setMessage('');
    const res=await fetch(`/api/recommendations/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status,create_task:createTask})});
    const json=await res.json().catch(()=>({}));
    setBusy(false);
    if(!res.ok) return setMessage(json.error||'Action failed');
    setMessage(status==='accepted'?(createTask?'Accepted and task created':'Accepted'):status==='dismissed'?'Dismissed':'Completed');
    window.setTimeout(()=>location.reload(),500);
  }
  return <div className="flex flex-wrap items-center gap-2">
    <button disabled={busy} onClick={()=>act('accepted',!hasTask)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{hasTask?'Accept':'Accept + create task'}</button>
    <button disabled={busy} onClick={()=>act('dismissed')} className="rounded-xl border px-3 py-2 text-xs font-semibold">Dismiss</button>
    {hasTask&&<button disabled={busy} onClick={()=>act('completed')} className="rounded-xl border px-3 py-2 text-xs font-semibold">Mark complete</button>}
    {message&&<span className="text-xs text-slate-500">{message}</span>}
  </div>
}
