'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MaterialSubmittal } from '@/lib/types';

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

const REVIEWABLE = new Set(['PENDING_REVIEW', 'DEVIATION_PENDING_OWNER']);

export function MepSubmittalsTable({
  submittals,
  canReview = false,
  reviewLoadingId,
  onApprove,
  onReject,
}: {
  submittals: MaterialSubmittal[];
  canReview?: boolean;
  reviewLoadingId?: string | null;
  onApprove?: (submittal: MaterialSubmittal) => void;
  onReject?: (submittal: MaterialSubmittal) => void;
}) {
  const t = useTranslations('mep');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('statuses');

  if (submittals.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
        {t('noSubmittals')}
      </p>
    );
  }

  return (
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
            {canReview && (
              <th className="text-end px-4 py-3 font-medium">{tCommon('actions')}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {submittals.map((submittal) => {
            const deviation = submittal.status === 'DEVIATION_PENDING_OWNER';
            const reviewable = REVIEWABLE.has(submittal.status);
            const loading = reviewLoadingId === submittal.id;

            return (
              <tr
                key={submittal.id}
                className="border-t border-[var(--border)] text-[var(--text)]"
              >
                <td className="px-4 py-3 font-mono">{submittal.equipmentTag}</td>
                <td className="px-4 py-3">{submittal.proposedVendor}</td>
                <td className="px-4 py-3">
                  {submittal.csiDivision?.code} — {submittal.csiDivision?.title}
                </td>
                <td className="px-4 py-3 text-xs">
                  {submittal.specSection
                    ? `${submittal.specSection.code} — ${submittal.specSection.title}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {submittal.leadTimeWeeks != null
                    ? t('weeks', { count: submittal.leadTimeWeeks })
                    : '—'}
                </td>
                <td className="px-4 py-3">{formatEgp(submittal.costDeltaEGP)}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    {deviation && (
                      <Lock className="h-4 w-4 text-[var(--danger)]" />
                    )}
                    {tStatus.has(submittal.status)
                      ? tStatus(submittal.status)
                      : submittal.status.replace(/_/g, ' ')}
                  </span>
                  {deviation && (
                    <p className="text-xs text-[var(--danger)] mt-1">
                      {t('ownerOverride')}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  {submittal.systemRecommendation ? (
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs leading-snug ${recommendationClass(submittal.systemRecommendation)}`}
                    >
                      {submittal.systemRecommendation}
                    </span>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </td>
                {canReview && (
                  <td className="px-4 py-3 text-end">
                    {reviewable ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={loading}
                          className="btn-danger !px-2 !py-1 !text-xs"
                          onClick={() => onReject?.(submittal)}
                        >
                          {tCommon('reject')}
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          className="btn-success !px-2 !py-1 !text-xs"
                          onClick={() => onApprove?.(submittal)}
                        >
                          {deviation ? t('ownerApprove') : tCommon('approve')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
