'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';
export default function RecurringBatchRunButton(){const [busy,setBusy]=useState(false);const r=useRouter();return <button className="primary-button" disabled={busy} onClick={async()=>{setBusy(true);try{await fetch('/api/recurring-work/run',{method:'POST'});r.refresh()}finally{setBusy(false)}}}>{busy?'Running…':'Run due recurring work'}</button>}
