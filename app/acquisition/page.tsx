import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkspaceShell from '@/components/WorkspaceShell';

export default async function AcquisitionPage() {
  const { user, profile } = await requireUser();
  if (!user || !profile) redirect('/login');
  return <WorkspaceShell title="Buyer Acquisition" subtitle="Tracked buyer channels" profile={profile}><div className="rounded-2xl border bg-white p-6"><h1 className="text-2xl font-black">Buyer Acquisition</h1><p className="mt-2 text-sm text-slate-600">Build and track genuine buyer demand from Enugu and across Nigeria.</p></div></WorkspaceShell>;
}
