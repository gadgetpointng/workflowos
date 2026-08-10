'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TaskQuickCreate({people}:{people:{id:string;full_name:string|null}[]}){
 const router=useRouter(); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const fd=new FormData(e.currentTarget);const payload={title:fd.get('title'),assignee_id:fd.get('assignee_id')||null,priority:fd.get('priority'),due_at:fd.get('due_at')||null};const res=await fetch('/api/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const body=await res.json();setBusy(false);if(!res.ok){setError(body.error||'Could not create task');return;}e.currentTarget.reset();router.refresh();}
 return <form onSubmit={submit} className="quick-create-grid"><input name="title" required placeholder="Create a task…" className="app-input"/><select name="assignee_id" className="app-input"><option value="">Unassigned</option>{people.map(p=><option key={p.id} value={p.id}>{p.full_name||'Unnamed staff'}</option>)}</select><select name="priority" defaultValue="medium" className="app-input"><option>low</option><option>medium</option><option>high</option><option>urgent</option></select><input name="due_at" type="datetime-local" className="app-input"/><button disabled={busy} className="primary-button">{busy?'Creating…':'Add task'}</button>{error&&<div className="form-error">{error}</div>}</form>
}
