'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AutomationRuleCreate(){
  const router=useRouter(); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setMsg(''); const fd=new FormData(e.currentTarget);
    const body={
      name:String(fd.get('name')||''),
      trigger_event:String(fd.get('trigger_event')||''),
      action_type:String(fd.get('action_type')||''),
      capability:String(fd.get('capability')||'operations'),
      priority:String(fd.get('priority')||'medium'),
      active:true,
      conditions:{source:String(fd.get('source')||'')||null},
      action_config:{title_template:String(fd.get('title_template')||'')||null}
    };
    const r=await fetch('/api/automations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({})); setBusy(false);
    if(!r.ok){setMsg(j.error||'Could not create automation');return;}
    e.currentTarget.reset(); setMsg('Automation created'); router.refresh();
  }
  return <form onSubmit={submit} className="quick-grid">
    <input className="app-input" name="name" required placeholder="Automation name"/>
    <select className="app-input" name="trigger_event" defaultValue="lead.created"><option>lead.created</option><option>whatsapp.inquiry</option><option>cart.added</option><option>order.created</option><option>inventory.low</option><option>marketplace.demand</option><option>recommendation.accepted</option></select>
    <select className="app-input" name="action_type" defaultValue="create_task"><option value="create_task">Create staff task</option><option value="create_notification">Create notification</option><option value="create_marketplace_job">Queue marketplace job</option><option value="create_lead">Create lead</option></select>
    <input className="app-input" name="source" placeholder="Optional source filter"/>
    <input className="app-input" name="capability" defaultValue="operations" placeholder="Required capability"/>
    <select className="app-input" name="priority" defaultValue="medium"><option>low</option><option>medium</option><option>high</option><option>urgent</option></select>
    <input className="app-input" name="title_template" placeholder="Task/notification title template"/>
    <button className="primary-button" disabled={busy}>{busy?'Saving…':'Create automation'}</button>
    {msg&&<div className="form-note">{msg}</div>}
  </form>
}
