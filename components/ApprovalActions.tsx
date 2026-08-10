'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export default function ApprovalActions({id}:{id:string}){const router=useRouter();const[busy,setBusy]=useState('');async function act(status:'approved'|'rejected'){setBusy(status);await fetch(`/api/approvals/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});setBusy('');router.refresh();}return <div className="flex gap-2"><button disabled={!!busy} onClick={()=>act('approved')} className="mini-button">Approve</button><button disabled={!!busy} onClick={()=>act('rejected')} className="mini-button muted">Reject</button></div>}
