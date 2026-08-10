'use client';
import {useState} from 'react';
export default function ConversationReply({conversationId}:{conversationId:string}){
 const [body,setBody]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 async function send(e:React.FormEvent){e.preventDefault();if(!body.trim())return;setBusy(true);setError('');const r=await fetch(`/api/conversations/${conversationId}/messages`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body,direction:'outbound'})});const j=await r.json();setBusy(false);if(!r.ok){setError(j.error||'Could not send');return;}setBody('');location.reload();}
 return <form onSubmit={send} className="reply-composer"><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Reply to customer or add a follow-up message…" rows={4}/><div className="flex items-center justify-between gap-3"><small>{error||'Messages are stored in WorkflowOS. Channel delivery can be added by the connected WhatsApp provider.'}</small><button className="primary-button" disabled={busy}>{busy?'Sending…':'Send reply'}</button></div></form>
}
