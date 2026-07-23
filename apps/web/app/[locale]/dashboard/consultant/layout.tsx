import { getSession } from '@/lib/auth';
import { DashboardShell } from '@/components/DashboardShell';
import { CONSULTANT_ROLES } from '@/lib/types';
import { redirect } from 'next/navigation';

export default async function ConsultantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  if (!CONSULTANT_ROLES.includes(session.user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
