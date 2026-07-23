import { getSession } from '@/lib/auth';
import { DashboardShell } from '@/components/DashboardShell';
import { redirect } from 'next/navigation';

export default async function HeadEngineerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const allowed = ['HEAD_ENGINEER', 'PROJECT_MANAGER', 'ADMIN'];
  if (!allowed.includes(session.user.role)) {
    redirect(`/${locale}/dashboard`);
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
