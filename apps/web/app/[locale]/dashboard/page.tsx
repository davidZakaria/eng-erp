import { getSession } from '@/lib/auth';
import { CONSULTANT_ROLES } from '@/lib/types';
import { redirect } from 'next/navigation';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const { role } = session.user;

  if (role === 'SUPER_ADMIN') {
    redirect(`/${locale}/dashboard/super-admin`);
  }

  if (CONSULTANT_ROLES.includes(role)) {
    redirect(`/${locale}/dashboard/consultant`);
  }

  if (role === 'HEAD_ENGINEER') {
    redirect(`/${locale}/dashboard/head-engineer`);
  }

  if (role === 'SITE_ENGINEER') {
    redirect(`/${locale}/dashboard/site-engineer`);
  }

  if (role === 'PROJECT_MANAGER' || role === 'ADMIN') {
    redirect(`/${locale}/dashboard/head-engineer`);
  }

  redirect(`/${locale}/dashboard/legacy`);
}
