import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardShell } from '@/components/DashboardShell';
import { ConsultantDashboard } from '@/components/consultant/ConsultantDashboard';
import { HeadEngineerDashboard } from '@/components/head-engineer/HeadEngineerDashboard';
import { ProjectManagerDashboard } from '@/components/project-manager/ProjectManagerDashboard';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const { user } = session;

  return (
    <DashboardShell user={user}>
      {user.role === 'CONSULTANT' && <ConsultantDashboard />}
      {user.role === 'HEAD_ENGINEER' && <HeadEngineerDashboard />}
      {user.role === 'PROJECT_MANAGER' && <ProjectManagerDashboard />}
      {user.role === 'SITE_ENGINEER' && (
        <p className="text-[var(--muted)] text-sm">
          Site Engineer portal uses the execution API. Use the API directly or extend this dashboard.
        </p>
      )}
    </DashboardShell>
  );
}
