'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
const next:any={assigned:['accepted','Accept'],accepted:['in_progress','Start'],in_progress:['submitted','Submit'],rejected:['in_progress','Rework']};
export default function TaskTransitionActions({id,status}:{id:string;status:string}){const router=useRouter();const[busy,setBusy]=useState(false);const cfg=next[status];if(!cfg)return null;async function go(){setBusy(true);await fetch(`/api/tasks/${id}/transition`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:cfg[0]})});setBusy(false);router.refresh();}return <button onClick={go} disabled={busy} className="primary-button mt-4 w-full">{busy?'Updating…':cfg[1]}</button>}
