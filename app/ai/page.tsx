import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';
import AICopilot from '@/components/AICopilot';

export default async function AIPage(){
 const {user,profile}=await requireUser(); if(!user||!profile) redirect('/login');
 return <WorkspaceShell title="AI Copilot" subtitle="Decision support grounded in your live workspace" profile={profile}><div className="mx-auto max-w-7xl px-6 py-8"><div className="mb-7"><div className="text-sm font-semibold uppercase tracking-[.2em] text-slate-500">Decision intelligence</div><h1 className="mt-2 text-3xl font-bold">Ask WorkflowOS what to do next.</h1><p className="mt-2 max-w-2xl text-slate-600">Copilot summarizes live operational data and turns it into practical priorities for sales, campaigns, staff execution and connected commerce.</p></div><AICopilot/></div></WorkspaceShell>
}
