'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function AutomationToggle({id,active}:{id:string;active:boolean}){
 const [busy,setBusy]=useState(false); const router=useRouter();
 async function toggle(){setBusy(true);await fetch('/api/automations',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,active:!active})});setBusy(false);router.refresh();}
 return <button onClick={toggle} disabled={busy} className="secondary-button">{busy?'Updating…':active?'Pause':'Enable'}</button>;
}
