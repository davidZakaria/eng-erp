'use client';

import { useState } from 'react';
import { PendingDrawingsTab } from '@/components/head-engineer/PendingDrawingsTab';
import { MepSubmittalsTab } from '@/components/head-engineer/MepSubmittalsTab';
import { PourClearanceChecklist } from '@/components/head-engineer/PourClearanceChecklist';

type Tab = 'drawings' | 'mep' | 'structural';

export default function HeadEngineerDashboardPage() {
  const [tab, setTab] = useState<Tab>('drawings');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'drawings', label: 'Pending Drawings' },
    { id: 'mep', label: 'MEP Submittals' },
    { id: 'structural', label: 'Structural QA/QC' },
  ];

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
              tab === t.id
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'drawings' && <PendingDrawingsTab />}
      {tab === 'mep' && <MepSubmittalsTab />}
      {tab === 'structural' && <PourClearanceChecklist />}
    </div>
  );
}
