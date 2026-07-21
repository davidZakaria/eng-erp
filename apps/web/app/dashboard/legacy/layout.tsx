import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardShell } from '@/components/DashboardShell';

export default async function LegacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
