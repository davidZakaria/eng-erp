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

type Tab = 'team' | 'catalog' | 'boq' | 'drawings' | 'audit' | 'backups';

export default function SuperAdminDashboardPage() {
  const t = useTranslations('admin');
  const tNav = useTranslations('nav');
  const [tab, setTab] = useState<Tab>('team');
  const [focusPending, setFocusPending] = useState(false);
  const { pendingCount, listRefresh, registerPendingNavigation } =
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

      <div className="flex gap-1 mb-6 border-b border-[var(--border)] overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition whitespace-nowrap inline-flex items-center gap-2 ${
              tab === item.id
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {item.label}
            {item.id === 'drawings' && pendingCount > 0 && (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'team' && <TeamManagementTab allowSuperAdmin />}
      {tab === 'catalog' && <CatalogManageTab editable />}
      {tab === 'boq' && <BoqAdminTab />}
      {tab === 'drawings' && (
        <DrawingsAdminTab
          refreshToken={listRefresh}
          focusPendingFilter={focusPending}
          onFocusPendingHandled={() => setFocusPending(false)}
        />
      )}
      {tab === 'audit' && <AuditTrailTab />}
      {tab === 'backups' && <SystemBackupsTab />}
    </div>
  );
}
