import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardShell } from '@/components/DashboardShell';

export default async function HeadEngineerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const allowed = ['HEAD_ENGINEER', 'PROJECT_MANAGER', 'ADMIN'];
  if (!allowed.includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
