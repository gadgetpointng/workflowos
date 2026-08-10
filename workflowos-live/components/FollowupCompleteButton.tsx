'use client';
import { useState } from 'react'; import { useRouter } from 'next/navigation';
export default function FollowupCompleteButton({id}:{id:string}){const router=useRouter();const [busy,setBusy]=useState(false);async function done(){setBusy(true);await fetch('/api/lead-followups',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status:'completed',outcome:'contacted'})});setBusy(false);router.refresh();}return <button className="mini-button" disabled={busy} onClick={done}>{busy?'Saving…':'Complete'}</button>}
