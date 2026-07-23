'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MepSubmittalsTable } from '@/components/mep/MepSubmittalsTable';
import { MaterialSubmittal } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

export function MepSubmittalsTab() {
  const t = useTranslations('mep');
  const tCommon = useTranslations('common');
  const [submittals, setSubmittals] = useState<MaterialSubmittal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [reviewLoadingId, setReviewLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await clientApi<MaterialSubmittal[]>('/mep/submittals');
      setSubmittals(rows);
    } catch {
      setSubmittals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reviewSubmittal(
    submittal: MaterialSubmittal,
    statusDecision: 'APPROVED_FOR_CONSTRUCTION' | 'REVISION_REQUESTED',
  ) {
    setMessage('');
    setReviewLoadingId(submittal.id);
    try {
      await clientApi(`/mep/submittals/${submittal.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ statusDecision }),
      });
      setMessage(
        statusDecision === 'APPROVED_FOR_CONSTRUCTION'
          ? t('approveSuccess')
          : t('rejectSuccess'),
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('reviewFailed'));
    } finally {
      setReviewLoadingId(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2">
        <p className="text-xs text-[var(--muted)]">{t('hint')}</p>
        {message && <p className="text-xs text-[var(--text)]">{message}</p>}
      </div>
      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
          {tCommon('loading')}
        </p>
      ) : (
        <MepSubmittalsTable
          submittals={submittals}
          canReview
          reviewLoadingId={reviewLoadingId}
          onApprove={(submittal) =>
            void reviewSubmittal(submittal, 'APPROVED_FOR_CONSTRUCTION')
          }
          onReject={(submittal) =>
            void reviewSubmittal(submittal, 'REVISION_REQUESTED')
          }
        />
      )}
    </section>
  );
}
