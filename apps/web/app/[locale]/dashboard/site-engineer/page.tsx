'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApprovedDrawingsTab } from '@/components/site-engineer/ApprovedDrawingsTab';
import { LogPourTab } from '@/components/site-engineer/LogPourTab';
import { SiteDefectsTab } from '@/components/site-engineer/SiteDefectsTab';
import { SiteBoqTab } from '@/components/site-engineer/SiteBoqTab';
import { SiteRfisTab } from '@/components/site-engineer/SiteRfisTab';
import { DashboardTabNav } from '@/components/help/DashboardTabNav';
import { FeatureGuideBanner } from '@/components/help/FeatureGuideBanner';

type Tab = 'drawings' | 'pours' | 'boq' | 'defects' | 'rfis';

export default function SiteEngineerDashboardPage() {
  const t = useTranslations('site');
  const [tab, setTab] = useState<Tab>('drawings');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'drawings', label: t('approvedDrawings') },
    { id: 'pours', label: t('logPour') },
    { id: 'boq', label: t('boqProgress') },
    { id: 'defects', label: t('siteDefects') },
    { id: 'rfis', label: t('openRfis') },
  ];

  return (
    <div>
      <FeatureGuideBanner text={t('intro')} />

      <DashboardTabNav
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
        helpScope="siteEngineer"
      />

      {tab === 'drawings' && <ApprovedDrawingsTab />}
      {tab === 'pours' && <LogPourTab />}
      {tab === 'boq' && <SiteBoqTab />}
      {tab === 'defects' && <SiteDefectsTab />}
      {tab === 'rfis' && <SiteRfisTab />}
    </div>
  );
}
