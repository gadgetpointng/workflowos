'use client';

import { useState } from 'react';

type Msg={role:'user'|'assistant',content:string};

const starters=[
  'What should we do today to increase sales?',
  'Which leads need attention first?',
  'Give me a campaign idea using current demand signals.',
  'Where are we losing execution momentum?'
];

export default function AICopilot(){
 const [messages,setMessages]=useState<Msg[]>([]); const [prompt,setPrompt]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
 async function send(value?:string){const text=(value??prompt).trim(); if(!text||loading)return; setMessages(m=>[...m,{role:'user',content:text}]); setPrompt(''); setLoading(true); setError('');
  try{const r=await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:text})}); const j=await r.json(); if(!r.ok)throw new Error(j.error||'AI request failed'); setMessages(m=>[...m,{role:'assistant',content:j.output||'No response generated.'}]);}
  catch(e:any){setError(e.message||'AI request failed');}finally{setLoading(false)}
 }
 return <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
  <section className="rounded-3xl border bg-white shadow-sm overflow-hidden">
   <div className="border-b px-5 py-4"><div className="font-semibold">WorkflowOS Copilot</div><div className="text-sm text-slate-500">Grounded in your workspace data. It recommends actions but does not silently execute sensitive changes.</div></div>
   <div className="min-h-[420px] space-y-4 p-5">
    {!messages.length&&<div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Ask about priorities, leads, campaigns, staff execution, connected commerce, marketplace demand or vendor performance.</div>}
    {messages.map((m,i)=><div key={i} className={m.role==='user'?'ml-auto max-w-[85%] rounded-2xl bg-slate-900 p-4 text-sm text-white':'max-w-[92%] rounded-2xl bg-slate-100 p-4 text-sm whitespace-pre-wrap text-slate-800'}>{m.content}</div>)}
    {loading&&<div className="max-w-[80%] rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">Analyzing workspace…</div>}
   </div>
   <div className="border-t p-4"><div className="flex gap-2"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} rows={2} placeholder="Ask WorkflowOS…" className="min-h-[54px] flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"/><button onClick={()=>send()} disabled={loading||!prompt.trim()} className="rounded-2xl bg-slate-900 px-5 font-semibold text-white disabled:opacity-40">Send</button></div>{error&&<div className="mt-2 text-sm text-red-600">{error}</div>}</div>
  </section>
  <aside className="space-y-4"><div className="rounded-3xl border bg-white p-5 shadow-sm"><div className="font-semibold">Quick asks</div><div className="mt-3 space-y-2">{starters.map(s=><button key={s} onClick={()=>send(s)} className="w-full rounded-2xl border p-3 text-left text-sm hover:bg-slate-50">{s}</button>)}</div></div><div className="rounded-3xl border bg-slate-950 p-5 text-white"><div className="font-semibold">Guardrails</div><p className="mt-2 text-sm text-slate-300">Copilot can analyze and propose. Actions that change staff work, campaigns, listings, vendors or money should flow through explicit APIs and approval controls.</p></div></aside>
 </div>
}
