import { getSession } from '@/lib/auth';
import { DashboardShell } from '@/components/DashboardShell';
import { redirect } from 'next/navigation';

export default async function LegacyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
