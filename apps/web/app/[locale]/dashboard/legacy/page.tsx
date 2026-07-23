import { getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/auth';
import { ConsultantDashboard } from '@/components/consultant/ConsultantDashboard';
import { HeadEngineerDashboard } from '@/components/head-engineer/HeadEngineerDashboard';
import { ProjectManagerDashboard } from '@/components/project-manager/ProjectManagerDashboard';
import { redirect } from 'next/navigation';

export default async function LegacyDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const { user } = session;
  const t = await getTranslations('common');

  return (
    <>
      {user.role === 'CONSULTANT' && <ConsultantDashboard />}
      {user.role === 'HEAD_ENGINEER' && <HeadEngineerDashboard />}
      {user.role === 'PROJECT_MANAGER' && <ProjectManagerDashboard />}
      {user.role === 'SITE_ENGINEER' && (
        <p className="text-[var(--muted)] text-sm">{t('siteEngineerPortal')}</p>
      )}
    </>
  );
}
