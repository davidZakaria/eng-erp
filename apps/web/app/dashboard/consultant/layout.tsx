import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardShell } from '@/components/DashboardShell';
import { CONSULTANT_ROLES } from '@/lib/types';

export default async function ConsultantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!CONSULTANT_ROLES.includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
