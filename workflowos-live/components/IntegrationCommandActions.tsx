'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function IntegrationCommandActions({ id, status, canManage }:{ id:string; status:string; canManage:boolean }) {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  async function act(action:'approve'|'cancel'|'retry') {
    setBusy(true);
    await fetch(`/api/integration-commands/${id}`, { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({action}) });
    setBusy(false); router.refresh();
  }
  if (!canManage) return null;
  if (status === 'pending_approval') return <div className="flex gap-2"><button disabled={busy} onClick={()=>act('approve')} className="primary-button">Approve</button><button disabled={busy} onClick={()=>act('cancel')} className="secondary-button">Cancel</button></div>;
  if (status === 'failed') return <button disabled={busy} onClick={()=>act('retry')} className="primary-button">Retry command</button>;
  return null;
}
