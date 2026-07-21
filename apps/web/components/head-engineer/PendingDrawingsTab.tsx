'use client';

import { useCallback, useEffect, useState } from 'react';
import { Drawing } from '@/lib/types';
import { clientApi } from '@/lib/client-api';
import { fileExtensionFromUrl } from '@/lib/drawing-files';
import { DrawingFileButton } from '@/components/drawings/DrawingFileButton';

type ReviewDecision = 'APPROVED_FOR_CONSTRUCTION' | 'REVISION_REQUESTED';

export function PendingDrawingsTab() {
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
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 overflow-hidden">
        <p className="px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)]">
          Review each drawing, then Approve for construction or Request Revision.
          PDF opens in a new tab; DWG/DXF downloads for AutoCAD.
        </p>
        <table className="w-full text-sm">
          <thead className="bg-[#0f1419] text-[var(--muted)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Number</th>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Discipline</th>
              <th className="text-left px-4 py-3 font-medium">Rev</th>
              <th className="text-left px-4 py-3 font-medium">Format</th>
              <th className="text-left px-4 py-3 font-medium">Consultant</th>
              <th className="text-left px-4 py-3 font-medium">File</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drawings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted)]">
                  No drawings pending review.
                </td>
              </tr>
            ) : (
              drawings.map((d) => (
                <tr key={d.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-mono">{d.drawingNumber}</td>
                  <td className="px-4 py-3">{d.title}</td>
                  <td className="px-4 py-3">{d.discipline}</td>
                  <td className="px-4 py-3">{d.revision}</td>
                  <td className="px-4 py-3">{fileExtensionFromUrl(d.fileUrl)}</td>
                  <td className="px-4 py-3">{d.uploader?.fullName}</td>
                  <td className="px-4 py-3">
                    <DrawingFileButton drawing={d} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        setReviewModal({
                          drawing: d,
                          decision: 'APPROVED_FOR_CONSTRUCTION',
                        })
                      }
                      className="rounded bg-[var(--success)] px-3 py-1 text-xs text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewModal({
                          drawing: d,
                          decision: 'REVISION_REQUESTED',
                        })
                      }
                      className="rounded bg-[var(--danger)] px-3 py-1 text-xs text-white"
                    >
                      Request Revision
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
            <h3 className="text-lg font-medium mb-2">
              {reviewModal.decision === 'APPROVED_FOR_CONSTRUCTION'
                ? 'Approve Drawing'
                : 'Request Revision'}
            </h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              {reviewModal.drawing.drawingNumber} · {reviewModal.drawing.title} ·
              Rev {reviewModal.drawing.revision}
            </p>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Comments for the consultant…"
              rows={4}
              className="w-full rounded border border-[var(--border)] bg-[#0f1419] px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setReviewModal(null);
                  setComments('');
                }}
                className="rounded border border-[var(--border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReview}
                disabled={loading || !comments.trim()}
                className="rounded bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
