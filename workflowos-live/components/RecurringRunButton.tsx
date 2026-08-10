'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';
export default function RecurringRunButton({id}:{id:string}){const [busy,setBusy]=useState(false);const r=useRouter();async function run(){setBusy(true);await fetch(`/api/recurring-work/${id}/run`,{method:'POST'});setBusy(false);r.refresh()}return <button className="mini-button" onClick={run} disabled={busy}>{busy?'Generating…':'Generate now'}</button>}
