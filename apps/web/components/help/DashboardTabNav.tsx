'use client';

import { useTranslations } from 'next-intl';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { FeatureGuideBanner } from '@/components/help/FeatureGuideBanner';

export type DashboardTabItem = {
  id: string;
  label: string;
  badge?: number;
};

export function DashboardTabNav<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  helpScope,
}: {
  tabs: DashboardTabItem[];
  activeTab: T;
  onTabChange: (id: T) => void;
  helpScope: 'headEngineer' | 'siteEngineer' | 'superAdmin' | 'consultant';
}) {
  const tHelp = useTranslations('help');

  const tip = (tabId: string) => {
    const key = `tabs.${helpScope}.${tabId}.tip` as const;
    return tHelp.has(key) ? tHelp(key) : '';
  };

  const guideKey = `tabs.${helpScope}.${activeTab}.guide`;
  const guide = tHelp.has(guideKey) ? tHelp(guideKey) : '';

  return (
    <div className="mb-6">
      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
        {tabs.map((item) => {
          const tabTip = tip(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id as T)}
              title={tabTip || undefined}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 -mb-px transition whitespace-nowrap ${
                activeTab === item.id
                  ? 'border-[var(--accent)] text-[var(--text)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span>{item.label}</span>
              {tabTip && (
                <HelpTooltip
                  text={tabTip}
                  className="hidden sm:inline-flex"
                />
              )}
              {item.badge != null && item.badge > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <FeatureGuideBanner text={guide} />
    </div>
  );
}
