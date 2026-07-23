'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DrawingsAdminTab } from '@/components/admin/DrawingsAdminTab';
import { MepSubmittalsTab } from '@/components/head-engineer/MepSubmittalsTab';
import { PourClearanceChecklist } from '@/components/head-engineer/PourClearanceChecklist';
import { BoqExecutionTab } from '@/components/head-engineer/BoqExecutionTab';
import { ConcreteRebarTrackerTab } from '@/components/head-engineer/ConcreteRebarTrackerTab';
import { ProjectScheduleTab } from '@/components/head-engineer/ProjectScheduleTab';
import { RfisAndSnagsTab } from '@/components/head-engineer/RfisAndSnagsTab';
import { CatalogManageTab } from '@/components/admin/CatalogManageTab';
import { BoqAdminTab } from '@/components/admin/BoqAdminTab';
import { TeamManagementTab } from '@/components/admin/TeamManagementTab';
import { useDrawingReviewNotifications } from '@/components/drawings/DrawingReviewNotificationsProvider';
import { DashboardTabNav } from '@/components/help/DashboardTabNav';

type Tab =
  | 'drawings'
  | 'mep'
  | 'structural'
  | 'concreteRebar'
  | 'schedule'
  | 'execution'
  | 'rfis'
  | 'catalog'
  | 'boqAdmin'
  | 'team';

export default function HeadEngineerDashboardPage() {
  const tNav = useTranslations('nav');
  const [tab, setTab] = useState<Tab>('drawings');
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
    { id: 'drawings', label: tNav('pendingDrawings') },
    { id: 'mep', label: tNav('mepSubmittals') },
    { id: 'structural', label: tNav('structuralQa') },
    { id: 'concreteRebar', label: tNav('concreteRebar') },
    { id: 'schedule', label: tNav('projectSchedule') },
    { id: 'execution', label: tNav('fieldExecution') },
    { id: 'rfis', label: tNav('rfisAndSnags') },
    { id: 'catalog', label: tNav('projectCatalog') },
    { id: 'boqAdmin', label: tNav('boqManagement') },
    { id: 'team', label: tNav('teamManagement') },
  ];

  return (
    <div>
      <DashboardTabNav
        tabs={tabs.map((item) => ({
          ...item,
          badge: item.id === 'drawings' ? pendingCount : undefined,
        }))}
        activeTab={tab}
        onTabChange={setTab}
        helpScope="headEngineer"
      />

      {tab === 'drawings' && (
        <DrawingsAdminTab
          refreshToken={listRefresh}
          defaultStatusFilter="PENDING_REVIEW"
          focusPendingFilter={focusPending}
          onPendingChanged={() => {
            refreshPending().catch(() => {});
          }}
          onFocusPendingHandled={() => setFocusPending(false)}
        />
      )}
      {tab === 'mep' && <MepSubmittalsTab />}
      {tab === 'structural' && <PourClearanceChecklist />}
      {tab === 'concreteRebar' && <ConcreteRebarTrackerTab canImport />}
      {tab === 'schedule' && <ProjectScheduleTab canImport />}
      {tab === 'execution' && <BoqExecutionTab />}
      {tab === 'rfis' && <RfisAndSnagsTab />}
      {tab === 'catalog' && <CatalogManageTab editable />}
      {tab === 'boqAdmin' && <BoqAdminTab />}
      {tab === 'team' && <TeamManagementTab allowSuperAdmin={false} />}
    </div>
  );
}
