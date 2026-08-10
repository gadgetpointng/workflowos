'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function TimeEntryButton({taskId,running}:{taskId:string;running?:boolean}){
 const [busy,setBusy]=useState(false); const r=useRouter();
 async function act(){setBusy(true);try{await fetch('/api/time-entries',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task_id:taskId,action:running?'stop':'start'})});r.refresh();}finally{setBusy(false)}}
 return <button onClick={act} disabled={busy} className="mt-3 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50">{busy?'Saving…':running?'Stop timer':'Start timer'}</button>
}
