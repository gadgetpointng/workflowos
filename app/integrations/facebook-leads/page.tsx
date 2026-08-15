import WorkspaceShell from '@/components/WorkspaceShell';
import FacebookLeadIntegrationCard from '@/components/FacebookLeadIntegrationCard';
import { requireUser } from '@/lib/auth';

export default async function FacebookLeadsIntegrationPage() {
  const { profile } = await requireUser();
  return (
    <WorkspaceShell title="Facebook Leads" subtitle="Automatic Meta lead capture" profile={profile}>
      <div className="space-y-5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2377ff]">Acquisition integration</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[#08111f]">Facebook lead capture</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#697586]">Connect GadgetPoint's Facebook Page lead forms to WorkflowOS. New submissions become CRM leads automatically and enter the existing follow-up workflow.</p>
        </div>
        <FacebookLeadIntegrationCard />
      </div>
    </WorkspaceShell>
  );
}
