'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DrawingsAdminTab } from '@/components/admin/DrawingsAdminTab';
import { MepSubmittalsTab } from '@/components/head-engineer/MepSubmittalsTab';
import { PourClearanceChecklist } from '@/components/head-engineer/PourClearanceChecklist';
import { BoqExecutionTab } from '@/components/head-engineer/BoqExecutionTab';
import { RfisAndSnagsTab } from '@/components/head-engineer/RfisAndSnagsTab';
import { CatalogManageTab } from '@/components/admin/CatalogManageTab';
import { BoqAdminTab } from '@/components/admin/BoqAdminTab';
import { TeamManagementTab } from '@/components/admin/TeamManagementTab';
import { useDrawingReviewNotifications } from '@/components/drawings/DrawingReviewNotificationsProvider';

type Tab =
  | 'drawings'
  | 'mep'
  | 'structural'
  | 'execution'
  | 'rfis'
  | 'catalog'
  | 'boqAdmin'
  | 'team';

export default function HeadEngineerDashboardPage() {
  const tNav = useTranslations('nav');
  const [tab, setTab] = useState<Tab>('drawings');
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
    { id: 'drawings', label: tNav('pendingDrawings') },
    { id: 'mep', label: tNav('mepSubmittals') },
    { id: 'structural', label: tNav('structuralQa') },
    { id: 'execution', label: tNav('fieldExecution') },
    { id: 'rfis', label: tNav('rfisAndSnags') },
    { id: 'catalog', label: tNav('projectCatalog') },
    { id: 'boqAdmin', label: tNav('boqManagement') },
    { id: 'team', label: tNav('teamManagement') },
  ];

  return (
    <div>
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

      {tab === 'drawings' && (
        <DrawingsAdminTab
          refreshToken={listRefresh}
          focusPendingFilter={focusPending}
          onFocusPendingHandled={() => setFocusPending(false)}
        />
      )}
      {tab === 'mep' && <MepSubmittalsTab />}
      {tab === 'structural' && <PourClearanceChecklist />}
      {tab === 'execution' && <BoqExecutionTab />}
      {tab === 'rfis' && <RfisAndSnagsTab />}
      {tab === 'catalog' && <CatalogManageTab editable />}
      {tab === 'boqAdmin' && <BoqAdminTab />}
      {tab === 'team' && <TeamManagementTab allowSuperAdmin={false} />}
    </div>
  );
}
