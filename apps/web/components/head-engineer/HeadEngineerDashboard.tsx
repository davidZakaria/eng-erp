'use client';

import { useEffect, useState } from 'react';
import { ModelSubmission, VarianceReportRow } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function HeadEngineerDashboard() {
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
        {(['reviews', 'progress'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
              tab === t
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {t === 'reviews' ? 'Design Reviews' : 'Site Progress'}
          </button>
        ))}
      </div>

      {tab === 'reviews' && (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0f1419] text-[var(--muted)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-left px-4 py-3 font-medium">Consultant</th>
                <th className="text-left px-4 py-3 font-medium">Version</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                    No models pending review.
                  </td>
                </tr>
              ) : (
                pending.map((model) => (
                  <tr key={model.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{model.title}</td>
                    <td className="px-4 py-3">{model.project?.name}</td>
                    <td className="px-4 py-3">{model.consultant?.fullName}</td>
                    <td className="px-4 py-3">v{model.versionNumber}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() =>
                          setReviewModal({
                            model,
                            decision: 'APPROVED_FOR_CONSTRUCTION',
                          })
                        }
                        className="rounded bg-[var(--success)] px-3 py-1 text-xs text-white"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          setReviewModal({
                            model,
                            decision: 'REVISION_REQUESTED',
                          })
                        }
                        className="rounded bg-[var(--danger)] px-3 py-1 text-xs text-white"
                      >
                        Reject
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
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[#0f1419] text-[var(--muted)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Component</th>
                <th className="text-right px-4 py-3 font-medium">Planned Concrete (m³)</th>
                <th className="text-right px-4 py-3 font-medium">Actual Concrete (m³)</th>
                <th className="text-left px-4 py-3 font-medium">Planned End</th>
                <th className="text-left px-4 py-3 font-medium">Actual End</th>
              </tr>
            </thead>
            <tbody>
              {variance.map((row) => {
                const flagged = row.isOverBudget || row.isDelayed;
                return (
                  <tr
                    key={row.componentId}
                    className={`border-t border-[var(--border)] ${flagged ? 'text-[var(--danger)]' : ''}`}
                  >
                    <td className="px-4 py-3">{row.componentName}</td>
                    <td className="px-4 py-3 text-right">{row.plannedConcreteM3}</td>
                    <td className="px-4 py-3 text-right">{row.actualConcreteM3}</td>
                    <td className="px-4 py-3">{formatDate(row.plannedEndDate)}</td>
                    <td className="px-4 py-3">{formatDate(row.actualEndDate)}</td>
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
            <h3 className="text-lg font-medium mb-2">
              {reviewModal.decision === 'APPROVED_FOR_CONSTRUCTION'
                ? 'Approve Model'
                : 'Request Revision'}
            </h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              {reviewModal.model.title}
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
                onClick={() => {
                  setReviewModal(null);
                  setComments('');
                }}
                className="rounded border border-[var(--border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
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
    </div>
  );
}
