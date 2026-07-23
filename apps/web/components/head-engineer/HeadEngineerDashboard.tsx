'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ModelSubmission, VarianceReportRow } from '@/lib/types';
import { clientApi } from '@/lib/client-api';
import {
  getSubmissionFileUrl,
  isPdfFileName,
  fileLabelFromUrl,
} from '@/lib/model-files';

function formatDate(iso: string | null, locale: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function HeadEngineerDashboard() {
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const tDrawings = useTranslations('drawings');
  const tModels = useTranslations('models');
  const tReports = useTranslations('reports');
  const locale = useLocale();
  const [tab, setTab] = useState<'reviews' | 'progress'>('reviews');
  const [pending, setPending] = useState<ModelSubmission[]>([]);
  const [variance, setVariance] = useState<VarianceReportRow[]>([]);
  const [reviewModal, setReviewModal] = useState<{
    model: ModelSubmission;
    decision: 'APPROVED_FOR_CONSTRUCTION' | 'REVISION_REQUESTED';
  } | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadReviews() {
    const data = await clientApi<ModelSubmission[]>('/models/submissions');
    setPending(data);
  }

  async function loadVariance() {
    const data = await clientApi<VarianceReportRow[]>('/reports/variance');
    setVariance(data);
  }

  useEffect(() => {
    if (tab === 'reviews') loadReviews().catch(() => {});
    else loadVariance().catch(() => {});
  }, [tab]);

  function openFile(model: ModelSubmission) {
    window.open(getSubmissionFileUrl(model.id), '_blank', 'noopener,noreferrer');
  }

  async function submitReview() {
    if (!reviewModal) return;
    setLoading(true);
    try {
      await clientApi(
        `/models/submissions/${reviewModal.model.id}/review`,
        {
          method: 'POST',
          body: JSON.stringify({
            statusDecision: reviewModal.decision,
            comments,
          }),
        },
      );
      setReviewModal(null);
      setComments('');
      await loadReviews();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {(['reviews', 'progress'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
              tab === key
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {key === 'reviews' ? tNav('designReviews') : tNav('siteProgress')}
          </button>
        ))}
      </div>

      {tab === 'reviews' && (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3 font-medium">{tCommon('title')}</th>
                <th className="text-start px-4 py-3 font-medium">{tCommon('project')}</th>
                <th className="text-start px-4 py-3 font-medium">{tCommon('consultant')}</th>
                <th className="text-start px-4 py-3 font-medium">{tCommon('version')}</th>
                <th className="text-start px-4 py-3 font-medium">{tCommon('file')}</th>
                <th className="text-end px-4 py-3 font-medium">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                    {tModels('noPendingModels')}
                  </td>
                </tr>
              ) : (
                pending.map((model) => (
                  <tr key={model.id} className="border-t border-[var(--border)] text-[var(--text)]">
                    <td className="px-4 py-3">{model.title}</td>
                    <td className="px-4 py-3">{model.project?.name}</td>
                    <td className="px-4 py-3">{model.consultant?.fullName}</td>
                    <td className="px-4 py-3">v{model.versionNumber}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openFile(model)}
                        className="text-[var(--accent)] hover:underline text-xs"
                        title={fileLabelFromUrl(model.fileUrl)}
                      >
                        {isPdfFileName(model.fileUrl)
                          ? tDrawings('previewPdf')
                          : tDrawings('downloadCad')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-end space-x-2 rtl:space-x-reverse">
                      <button
                        type="button"
                        onClick={() =>
                          setReviewModal({
                            model,
                            decision: 'APPROVED_FOR_CONSTRUCTION',
                          })
                        }
                        className="btn-success"
                      >
                        {tCommon('approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReviewModal({
                            model,
                            decision: 'REVISION_REQUESTED',
                          })
                        }
                        className="btn-danger"
                      >
                        {tCommon('reject')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'progress' && (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3 font-medium">{tCommon('component')}</th>
                <th className="text-end px-4 py-3 font-medium">{tReports('plannedConcrete')}</th>
                <th className="text-end px-4 py-3 font-medium">{tReports('actualConcrete')}</th>
                <th className="text-start px-4 py-3 font-medium">{tReports('plannedEnd')}</th>
                <th className="text-start px-4 py-3 font-medium">{tReports('actualEnd')}</th>
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
      )}

      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="text-lg font-medium mb-2 text-[var(--text)]">
              {reviewModal.decision === 'APPROVED_FOR_CONSTRUCTION'
                ? tModels('approveModel')
                : tDrawings('requestRevision')}
            </h3>
            <p className="text-sm text-[var(--muted)] mb-2">
              {reviewModal.model.title} · v{reviewModal.model.versionNumber}
            </p>
            <button
              type="button"
              onClick={() => openFile(reviewModal.model)}
              className="mb-4 text-sm text-[var(--accent)] hover:underline"
            >
              {isPdfFileName(reviewModal.model.fileUrl)
                ? tModels('previewDrawingPdf')
                : tModels('downloadDrawingCad')}
            </button>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={tDrawings('commentsPlaceholder')}
              rows={4}
              className="w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setReviewModal(null);
                  setComments('');
                }}
                className="btn-secondary"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={submitReview}
                disabled={loading || !comments.trim()}
                className="btn-primary"
              >
                {tCommon('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
