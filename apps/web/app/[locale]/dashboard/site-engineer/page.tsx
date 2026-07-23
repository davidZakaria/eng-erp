'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApprovedDrawingsTab } from '@/components/site-engineer/ApprovedDrawingsTab';
import { LogPourTab } from '@/components/site-engineer/LogPourTab';
import { SiteDefectsTab } from '@/components/site-engineer/SiteDefectsTab';
import { SiteBoqTab } from '@/components/site-engineer/SiteBoqTab';
import { SiteRfisTab } from '@/components/site-engineer/SiteRfisTab';

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
      <p className="text-sm text-[var(--muted)] mb-4">{t('intro')}</p>

      <div className="flex gap-1 mb-6 border-b border-[var(--border)] overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition whitespace-nowrap ${
              tab === item.id
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'drawings' && <ApprovedDrawingsTab />}
      {tab === 'pours' && <LogPourTab />}
      {tab === 'boq' && <SiteBoqTab />}
      {tab === 'defects' && <SiteDefectsTab />}
      {tab === 'rfis' && <SiteRfisTab />}
    </div>
  );
}
