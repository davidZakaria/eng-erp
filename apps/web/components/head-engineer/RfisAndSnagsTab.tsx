'use client';

import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RFI, SiteDefect } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

function severityClass(severity: string): string {
  if (severity === 'HIGH') return 'text-[var(--danger)] font-semibold';
  if (severity === 'MEDIUM') return 'text-[var(--chip-warn-text)] font-semibold';
  return 'text-[var(--muted)]';
}

export function RfisAndSnagsTab() {
  const t = useTranslations('execution');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('statuses');
  const tSeverity = useTranslations('severity');
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [defects, setDefects] = useState<SiteDefect[]>([]);

  useEffect(() => {
    Promise.all([
      clientApi<RFI[]>('/rfi'),
      clientApi<SiteDefect[]>('/defects'),
    ])
      .then(([rfiData, defectData]) => {
        setRfis(rfiData);
        setDefects(defectData);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <h3 className="px-4 py-3 border-b border-[var(--border)] text-sm font-medium text-[var(--text)]">
          {t('rfi')}
        </h3>
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

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <h3 className="px-4 py-3 border-b border-[var(--border)] text-sm font-medium text-[var(--text)]">
          {t('defect')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3 font-medium">{tCommon('location')}</th>
                <th className="text-start px-4 py-3 font-medium">{tCommon('description')}</th>
                <th className="text-start px-4 py-3 font-medium">{tCommon('severity')}</th>
                <th className="text-start px-4 py-3 font-medium">{tCommon('status')}</th>
              </tr>
            </thead>
            <tbody>
              {defects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                    {t('noDefects')}
                  </td>
                </tr>
              ) : (
                defects.map((defect) => (
                  <tr key={defect.id} className="border-t border-[var(--border)] text-[var(--text)]">
                    <td className="px-4 py-3">{defect.location}</td>
                    <td className="px-4 py-3">{defect.description}</td>
                    <td className={`px-4 py-3 font-medium ${severityClass(defect.severity)}`}>
                      {tSeverity.has(defect.severity)
                        ? tSeverity(defect.severity)
                        : defect.severity}
                    </td>
                    <td className="px-4 py-3">
                      {tStatus.has(defect.status)
                        ? tStatus(defect.status)
                        : defect.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
