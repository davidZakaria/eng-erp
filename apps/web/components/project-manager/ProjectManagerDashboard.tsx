'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { VarianceReportRow } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

function formatDate(iso: string | null, locale: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ProjectManagerDashboard() {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [variance, setVariance] = useState<VarianceReportRow[]>([]);

  useEffect(() => {
    clientApi<VarianceReportRow[]>('/reports/variance')
      .then(setVariance)
      .catch(() => {});
  }, []);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
      <h2 className="text-lg font-medium px-4 py-3 border-b border-[var(--border)] text-[var(--text)]">
        {t('varianceTitle')}
      </h2>
      <table className="w-full text-sm min-w-[720px]">
        <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
          <tr>
            <th className="text-start px-4 py-3 font-medium">{tCommon('component')}</th>
            <th className="text-end px-4 py-3 font-medium">{t('plannedConcrete')}</th>
            <th className="text-end px-4 py-3 font-medium">{t('actualConcrete')}</th>
            <th className="text-start px-4 py-3 font-medium">{t('plannedEnd')}</th>
            <th className="text-start px-4 py-3 font-medium">{t('actualEnd')}</th>
          </tr>
        </thead>
        <tbody>
          {variance.map((row) => {
            const flagged = row.isOverBudget || row.isDelayed;
            return (
              <tr
                key={row.componentId}
                className={`border-t border-[var(--border)] ${flagged ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}
              >
                <td className="px-4 py-3">{row.componentName}</td>
                <td className="px-4 py-3 text-end">{row.plannedConcreteM3}</td>
                <td className="px-4 py-3 text-end">{row.actualConcreteM3}</td>
                <td className="px-4 py-3">{formatDate(row.plannedEndDate, locale)}</td>
                <td className="px-4 py-3">{formatDate(row.actualEndDate, locale)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
