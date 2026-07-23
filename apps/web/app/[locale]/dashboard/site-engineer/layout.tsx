import { getSession } from '@/lib/auth';
import { DashboardShell } from '@/components/DashboardShell';
import { redirect } from 'next/navigation';

export default async function SiteEngineerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  if (session.user.role !== 'SITE_ENGINEER') {
    redirect(`/${locale}/dashboard`);
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
