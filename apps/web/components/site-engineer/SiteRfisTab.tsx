'use client';

import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RFI } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

export function SiteRfisTab() {
  const t = useTranslations('execution');
  const tSite = useTranslations('site');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('statuses');
  const [rfis, setRfis] = useState<RFI[]>([]);

  useEffect(() => {
    clientApi<RFI[]>('/rfi')
      .then(setRfis)
      .catch(() => {});
  }, []);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <p className="px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)]">
        {tSite('rfisHint')}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
            <tr>
              <th className="text-start px-4 py-3 font-medium">{t('rfiNumber')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('question')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('status')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('dueDate')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('commercial')}</th>
            </tr>
          </thead>
          <tbody>
            {rfis.map((rfi) => (
              <tr key={rfi.id} className="border-t border-[var(--border)] text-[var(--text)]">
                <td className="px-4 py-3 font-mono">{rfi.rfiNumber}</td>
                <td className="px-4 py-3 max-w-md">
                  <p>{rfi.question}</p>
                  {rfi.answer && (
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {tCommon('answer')}: {rfi.answer}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {tStatus.has(rfi.status) ? tStatus(rfi.status) : rfi.status}
                </td>
                <td className="px-4 py-3">
                  {new Date(rfi.dueDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {rfi.impactsCost ? (
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--chip-cost-bg)] border border-[var(--chip-cost-border)] px-2 py-1 text-xs font-semibold text-[var(--chip-cost-text)]">
                      <DollarSign className="h-3.5 w-3.5" />
                      {t('costImpact')}
                    </span>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
