'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Drawing } from '@/lib/types';
import { clientApi } from '@/lib/client-api';
import { fileExtensionFromUrl } from '@/lib/drawing-files';
import { DrawingFileButton } from '@/components/drawings/DrawingFileButton';

type ReviewDecision = 'APPROVED_FOR_CONSTRUCTION' | 'REVISION_REQUESTED';

export function PendingDrawingsTab() {
  const t = useTranslations('drawings');
  const tCommon = useTranslations('common');
  const tDisc = useTranslations('disciplines');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [reviewModal, setReviewModal] = useState<{
    drawing: Drawing;
    decision: ReviewDecision;
  } | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const loadDrawings = useCallback(async () => {
    const data = await clientApi<Drawing[]>('/drawings?pending=true');
    setDrawings(data);
  }, []);

  useEffect(() => {
    loadDrawings().catch(() => {});
  }, [loadDrawings]);

  async function submitReview() {
    if (!reviewModal) return;
    setLoading(true);
    try {
      await clientApi(`/drawings/${reviewModal.drawing.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          statusDecision: reviewModal.decision,
          comments,
        }),
      });
      setReviewModal(null);
      setComments('');
      await loadDrawings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <p className="px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)]">
          {t('pendingHint')}
        </p>
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
            <tr>
              <th className="text-start px-4 py-3 font-medium">{tCommon('number')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('title')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('discipline')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('revision')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('format')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('consultant')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('file')}</th>
              <th className="text-end px-4 py-3 font-medium">{tCommon('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {drawings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted)]">
                  {t('noPending')}
                </td>
              </tr>
            ) : (
              drawings.map((d) => (
                <tr key={d.id} className="border-t border-[var(--border)] text-[var(--text)]">
                  <td className="px-4 py-3 font-mono">{d.drawingNumber}</td>
                  <td className="px-4 py-3">{d.title}</td>
                  <td className="px-4 py-3">{tDisc(d.discipline)}</td>
                  <td className="px-4 py-3">{d.revision}</td>
                  <td className="px-4 py-3">{fileExtensionFromUrl(d.fileUrl)}</td>
                  <td className="px-4 py-3">{d.uploader?.fullName}</td>
                  <td className="px-4 py-3">
                    <DrawingFileButton drawing={d} />
                  </td>
                  <td className="px-4 py-3 text-end space-x-2 rtl:space-x-reverse whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        setReviewModal({
                          drawing: d,
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
                          drawing: d,
                          decision: 'REVISION_REQUESTED',
                        })
                      }
                      className="btn-danger"
                    >
                      {t('requestRevision')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="text-lg font-medium mb-2 text-[var(--text)]">
              {reviewModal.decision === 'APPROVED_FOR_CONSTRUCTION'
                ? t('approveDrawing')
                : t('requestRevision')}
            </h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              {reviewModal.drawing.drawingNumber} · {reviewModal.drawing.title} ·{' '}
              {tCommon('revision')} {reviewModal.drawing.revision}
            </p>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={t('commentsPlaceholder')}
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
    </>
  );
}
