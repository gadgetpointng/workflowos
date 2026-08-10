'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function SiteQuickCreate(){
 const r=useRouter(); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 async function submit(fd:FormData){setBusy(true);setError('');const res=await fetch('/api/sites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:fd.get('name'),domain:fd.get('domain'),site_type:fd.get('site_type')})});if(!res.ok){setError((await res.json()).error||'Could not add site');setBusy(false);return;}r.refresh();setBusy(false);}
 return <form action={submit} className="rounded-3xl border bg-white p-5 shadow-sm"><div className="font-semibold">Connect another site</div><div className="mt-4 grid gap-3"><input name="name" required placeholder="Site name" className="rounded-xl border px-3 py-2"/><input name="domain" placeholder="example.com" className="rounded-xl border px-3 py-2"/><select name="site_type" className="rounded-xl border px-3 py-2"><option value="commerce">Commerce</option><option value="service">Service</option><option value="content">Content</option><option value="custom">Custom</option></select><button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">{busy?'Adding…':'Add site'}</button>{error&&<div className="text-sm text-red-600">{error}</div>}</div></form>
}
