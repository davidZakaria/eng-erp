'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TeamManagementTab } from '@/components/admin/TeamManagementTab';
import { AuditTrailTab } from '@/components/admin/AuditTrailTab';
import { SystemBackupsTab } from '@/components/admin/SystemBackupsTab';
import { CatalogManageTab } from '@/components/admin/CatalogManageTab';
import { BoqAdminTab } from '@/components/admin/BoqAdminTab';
import { DrawingsAdminTab } from '@/components/admin/DrawingsAdminTab';
import { useDrawingReviewNotifications } from '@/components/drawings/DrawingReviewNotificationsProvider';
import { DashboardTabNav } from '@/components/help/DashboardTabNav';

type Tab = 'team' | 'catalog' | 'boq' | 'drawings' | 'audit' | 'backups';

export default function SuperAdminDashboardPage() {
  const t = useTranslations('admin');
  const tNav = useTranslations('nav');
  const [tab, setTab] = useState<Tab>('team');
  const [focusPending, setFocusPending] = useState(false);
  const { pendingCount, listRefresh, registerPendingNavigation, refreshPending } =
    useDrawingReviewNotifications();

  useEffect(() => {
    return registerPendingNavigation(() => {
      setTab('drawings');
      setFocusPending(true);
    });
  }, [registerPendingNavigation]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'team', label: t('teamManagement') },
    { id: 'catalog', label: t('masterData') },
    { id: 'boq', label: t('boqManagement') },
    { id: 'drawings', label: tNav('pendingDrawings') },
    { id: 'audit', label: t('auditTrail') },
    { id: 'backups', label: t('systemBackups') },
  ];

  return (
    <div>
      <h1 className="text-xl font-medium text-[var(--text)] mb-1">{t('title')}</h1>
      <p className="text-xs text-[var(--muted)] mb-4">{t('superAdminHint')}</p>

      <DashboardTabNav
        tabs={tabs.map((item) => ({
          ...item,
          badge: item.id === 'drawings' ? pendingCount : undefined,
        }))}
        activeTab={tab}
        onTabChange={setTab}
        helpScope="superAdmin"
      />

      {tab === 'team' && <TeamManagementTab allowSuperAdmin />}
      {tab === 'catalog' && <CatalogManageTab editable />}
      {tab === 'boq' && <BoqAdminTab />}
      {tab === 'drawings' && (
        <DrawingsAdminTab
          refreshToken={listRefresh}
          defaultStatusFilter="PENDING_REVIEW"
          enableBulkDelete
          focusPendingFilter={focusPending}
          onPendingChanged={() => {
            refreshPending().catch(() => {});
          }}
          onFocusPendingHandled={() => setFocusPending(false)}
        />
      )}
      {tab === 'audit' && <AuditTrailTab />}
      {tab === 'backups' && <SystemBackupsTab />}
    </div>
  );
}
