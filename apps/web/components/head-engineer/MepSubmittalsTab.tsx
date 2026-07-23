'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MaterialSubmittal } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

function formatEgp(value: number | null): string {
  if (value == null) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toLocaleString('en-EG')} EGP`;
}

function recommendationClass(text: string | null): string {
  if (!text) return 'bg-[var(--surface-elevated)] text-[var(--muted)]';
  if (text.startsWith('✅')) {
    return 'bg-[var(--chip-success-bg)] text-[var(--chip-success-text)] border border-[var(--chip-success-border)]';
  }
  if (text.startsWith('⚠️')) {
    return 'bg-[var(--chip-warn-bg)] text-[var(--chip-warn-text)] border border-[var(--chip-warn-border)]';
  }
  return 'bg-[var(--surface-elevated)] text-[var(--text)]';
}

export function MepSubmittalsTab() {
  const t = useTranslations('mep');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('statuses');
  const [submittals, setSubmittals] = useState<MaterialSubmittal[]>([]);

  useEffect(() => {
    clientApi<MaterialSubmittal[]>('/mep/submittals')
      .then(setSubmittals)
      .catch(() => {});
  }, []);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <p className="px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)]">
        {t('hint')}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
            <tr>
              <th className="text-start px-4 py-3 font-medium">{t('equipmentTag')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('proposedVendor')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('csiDivision')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('specSection')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('leadTime')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('costDelta')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('status')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('systemRecommendation')}</th>
              <th className="text-end px-4 py-3 font-medium">{tCommon('action')}</th>
            </tr>
          </thead>
          <tbody>
            {submittals.map((s) => {
              const locked = s.status === 'DEVIATION_PENDING_OWNER';
              return (
                <tr key={s.id} className="border-t border-[var(--border)] text-[var(--text)]">
                  <td className="px-4 py-3 font-mono">{s.equipmentTag}</td>
                  <td className="px-4 py-3">{s.proposedVendor}</td>
                  <td className="px-4 py-3">
                    {s.csiDivision?.code} — {s.csiDivision?.title}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {s.specSection
                      ? `${s.specSection.code} — ${s.specSection.title}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {s.leadTimeWeeks != null
                      ? t('weeks', { count: s.leadTimeWeeks })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{formatEgp(s.costDeltaEGP)}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      {locked && (
                        <Lock className="h-4 w-4 text-[var(--danger)]" />
                      )}
                      {tStatus.has(s.status)
                        ? tStatus(s.status)
                        : s.status.replace(/_/g, ' ')}
                    </span>
                    {locked && (
                      <p className="text-xs text-[var(--danger)] mt-1">
                        {t('ownerOverride')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {s.systemRecommendation ? (
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs leading-snug ${recommendationClass(s.systemRecommendation)}`}
                      >
                        {s.systemRecommendation}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button type="button" disabled={locked} className="btn-success">
                      {tCommon('approve')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
