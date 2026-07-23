'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Discipline, Drawing, ItemStatus } from '@/lib/types';
import { clientApi } from '@/lib/client-api';
import { fileExtensionFromUrl, getDrawingFileUrl } from '@/lib/drawing-files';
import { DrawingFileButton } from '@/components/drawings/DrawingFileButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type ReviewDecision = 'APPROVED_FOR_CONSTRUCTION' | 'REVISION_REQUESTED';

const DISCIPLINES: Discipline[] = [
  'ARCHITECTURAL',
  'STRUCTURAL',
  'MEP',
  'INFRASTRUCTURE',
];

const STATUSES: ItemStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'REVISION_REQUESTED',
  'APPROVED_FOR_CONSTRUCTION',
  'SUPERSEDED',
];

const emptyForm = {
  drawingNumber: '',
  title: '',
  discipline: 'ARCHITECTURAL' as Discipline,
  revision: 0,
  status: 'PENDING_REVIEW' as ItemStatus,
  fileUrl: '',
  projectNumber: '',
  disciplineCode: '',
  sheetNumber: '',
  sheetSize: '',
  scale: '',
  packageName: '',
};

function statusBadgeClass(status: string): string {
  if (status === 'REVISION_REQUESTED') {
    return 'bg-[var(--status-revision-bg)] text-[var(--status-revision-text)]';
  }
  if (status === 'PENDING_REVIEW') {
    return 'bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]';
  }
  if (status === 'APPROVED_FOR_CONSTRUCTION') {
    return 'bg-[var(--chip-success-bg)] text-[var(--chip-success-text)]';
  }
  return 'bg-[var(--surface-elevated)] text-[var(--text)]';
}

export function DrawingsAdminTab({
  refreshToken = 0,
  focusPendingFilter = false,
  defaultStatusFilter = '',
  enableBulkDelete = false,
  onPendingChanged,
  onFocusPendingHandled,
}: {
  refreshToken?: number;
  focusPendingFilter?: boolean;
  defaultStatusFilter?: string;
  /** Super Admin only — check-all and bulk delete. */
  enableBulkDelete?: boolean;
  onPendingChanged?: () => void;
  onFocusPendingHandled?: () => void;
}) {
  const t = useTranslations('admin');
  const tDrawings = useTranslations('drawings');
  const tCommon = useTranslations('common');
  const tDisc = useTranslations('disciplines');
  const tStatus = useTranslations('statuses');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Drawing | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [reviewModal, setReviewModal] = useState<{
    drawing: Drawing;
    decision: ReviewDecision;
  } | null>(null);
  const [comments, setComments] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showStoragePath, setShowStoragePath] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<
    | { type: 'single'; drawing: Drawing }
    | { type: 'bulk'; count: number }
    | null
  >(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await clientApi<Drawing[]>('/drawings');
      setDrawings(data);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (refreshToken > 0) {
      load(true).catch(() => {});
    }
  }, [refreshToken, load]);

  useEffect(() => {
    if (focusPendingFilter) {
      setStatusFilter('PENDING_REVIEW');
      onFocusPendingHandled?.();
    }
  }, [focusPendingFilter, onFocusPendingHandled]);

  const filtered = useMemo(() => {
    if (!statusFilter) return drawings;
    return drawings.filter((d) => d.status === statusFilter);
  }, [drawings, statusFilter]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((d) => selectedIds.has(d.id));
  const selectedCount = filtered.filter((d) => selectedIds.has(d.id)).length;

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((d) => next.delete(d.id));
      } else {
        filtered.forEach((d) => next.add(d.id));
      }
      return next;
    });
  }

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setShowStoragePath(true);
    setForm(emptyForm);
  }

  function openEdit(drawing: Drawing) {
    setEditing(drawing);
    setCreating(false);
    setShowStoragePath(false);
    setForm({
      drawingNumber: drawing.drawingNumber,
      title: drawing.title,
      discipline: drawing.discipline,
      revision: drawing.revision,
      status: drawing.status,
      fileUrl: drawing.fileUrl,
      projectNumber: drawing.projectNumber ?? '',
      disciplineCode: drawing.disciplineCode ?? '',
      sheetNumber: drawing.sheetNumber ?? '',
      sheetSize: drawing.sheetSize ?? '',
      scale: drawing.scale ?? '',
      packageName: drawing.packageName ?? '',
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      const payload = {
        ...form,
        projectNumber: form.projectNumber || undefined,
        disciplineCode: form.disciplineCode || undefined,
        sheetNumber: form.sheetNumber || undefined,
        sheetSize: form.sheetSize || undefined,
        scale: form.scale || undefined,
        packageName: form.packageName || undefined,
      };
      if (creating) {
        await clientApi('/drawings/manage', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else if (editing) {
        await clientApi(`/drawings/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('saveFailed'));
    }
  }

  function requestRemoveDrawing(drawing: Drawing) {
    setDeleteConfirm({ type: 'single', drawing });
  }

  function requestRemoveSelected() {
    const count = filtered.filter((d) => selectedIds.has(d.id)).length;
    if (count === 0) return;
    setDeleteConfirm({ type: 'bulk', count });
  }

  async function executeDeleteConfirm() {
    if (!deleteConfirm) return;

    setMessage('');
    setDeleteLoading(true);

    try {
      if (deleteConfirm.type === 'single') {
        const { drawing } = deleteConfirm;
        await clientApi(`/drawings/${drawing.id}`, { method: 'DELETE' });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(drawing.id);
          return next;
        });
        setMessage(t('drawingDeleted'));
      } else {
        const ids = filtered.filter((d) => selectedIds.has(d.id)).map((d) => d.id);
        for (const id of ids) {
          await clientApi(`/drawings/${id}`, { method: 'DELETE' });
        }
        setSelectedIds(new Set());
        setMessage(t('bulkDeleteDone', { count: ids.length }));
      }

      setDeleteConfirm(null);
      onPendingChanged?.();
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setDeleteLoading(false);
      setBulkDeleting(false);
    }
  }

  async function submitReview() {
    if (!reviewModal) return;
    setReviewLoading(true);
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
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setReviewLoading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{tCommon('loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">{t('drawingsManageHint')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
          >
            <option value="">{tDrawings('allStatuses')}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {tStatus.has(status) ? tStatus(status) : status}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary" onClick={openCreate}>
            {t('addDrawing')}
          </button>
        </div>
      </div>

      {(creating || editing) && (
        <form
          onSubmit={onSubmit}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 grid gap-3 sm:grid-cols-3"
        >
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tCommon('number')}</span>
            <input
              required
              value={form.drawingNumber}
              onChange={(e) => setForm((f) => ({ ...f, drawingNumber: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 font-mono"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">{tCommon('title')}</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tDrawings('discipline')}</span>
            <select
              value={form.discipline}
              onChange={(e) =>
                setForm((f) => ({ ...f, discipline: e.target.value as Discipline }))
              }
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            >
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {tDisc(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tCommon('revision')}</span>
            <input
              required
              type="number"
              min={0}
              value={form.revision}
              onChange={(e) => setForm((f) => ({ ...f, revision: Number(e.target.value) }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tCommon('status')}</span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as ItemStatus }))
              }
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {tStatus.has(status) ? tStatus(status) : status}
                </option>
              ))}
            </select>
          </label>
          <div className="block text-sm sm:col-span-3">
            <span className="text-[var(--muted)]">
              {editing ? t('drawingFile') : t('storagePath')}
            </span>
            {editing ? (
              <div className="mt-2 rounded border border-[var(--border)] bg-[var(--surface-elevated)]/40 p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <a
                    href={getDrawingFileUrl(editing.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline font-medium"
                  >
                    {t('openFileLink')} ({fileExtensionFromUrl(form.fileUrl)})
                  </a>
                  <DrawingFileButton
                    drawing={{
                      ...editing,
                      drawingNumber: form.drawingNumber,
                      title: form.title,
                      fileUrl: form.fileUrl,
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--muted)]">{t('fileLinkHint')}</p>
                {!showStoragePath ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline"
                    onClick={() => setShowStoragePath(true)}
                  >
                    {t('editStoragePath')}
                  </button>
                ) : (
                  <label className="block text-sm">
                    <span className="text-[var(--muted)]">{t('storagePath')}</span>
                    <input
                      required
                      value={form.fileUrl}
                      onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
                      className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 font-mono text-xs"
                    />
                  </label>
                )}
              </div>
            ) : (
              <>
                <input
                  required
                  value={form.fileUrl}
                  onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
                  placeholder="eng-njd-documents/drawings/..."
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 font-mono text-xs"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">{t('storagePathHint')}</p>
              </>
            )}
          </div>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tDrawings('projectNumber')}</span>
            <input
              value={form.projectNumber}
              onChange={(e) => setForm((f) => ({ ...f, projectNumber: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tDrawings('sheetCode')}</span>
            <input
              value={form.disciplineCode}
              onChange={(e) => setForm((f) => ({ ...f, disciplineCode: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tDrawings('sheetNumber')}</span>
            <input
              value={form.sheetNumber}
              onChange={(e) => setForm((f) => ({ ...f, sheetNumber: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tDrawings('sheetSize')}</span>
            <input
              value={form.sheetSize}
              onChange={(e) => setForm((f) => ({ ...f, sheetSize: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tDrawings('scale')}</span>
            <input
              value={form.scale}
              onChange={(e) => setForm((f) => ({ ...f, scale: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tDrawings('packageName')}</span>
            <input
              value={form.packageName}
              onChange={(e) => setForm((f) => ({ ...f, packageName: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <div className="sm:col-span-3 flex gap-2">
            <button type="submit" className="btn-primary">
              {tCommon('save')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setCreating(false);
                setEditing(null);
                setShowStoragePath(false);
              }}
            >
              {tCommon('cancel')}
            </button>
          </div>
        </form>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {enableBulkDelete && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2">
            <label className="inline-flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="rounded border-[var(--border)]"
              />
              {t('checkAllVisible', { count: filtered.length })}
            </label>
            <button
              type="button"
              className="btn-danger !px-3 !py-1.5 !text-xs"
              disabled={selectedCount === 0 || bulkDeleting}
              onClick={requestRemoveSelected}
            >
              {bulkDeleting
                ? tCommon('loading')
                : t('deleteSelected', { count: selectedCount })}
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                {enableBulkDelete && (
                  <th className="w-10 px-4 py-3">
                    <span className="sr-only">{t('checkAllVisible', { count: filtered.length })}</span>
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      disabled={filtered.length === 0}
                      className="rounded border-[var(--border)]"
                      aria-label={t('checkAllVisible', { count: filtered.length })}
                    />
                  </th>
                )}
                <th className="text-start px-4 py-3">{tCommon('number')}</th>
                <th className="text-start px-4 py-3">{tCommon('title')}</th>
                <th className="text-start px-4 py-3">{tDrawings('discipline')}</th>
                <th className="text-start px-4 py-3">{tCommon('revision')}</th>
                <th className="text-start px-4 py-3">{tCommon('status')}</th>
                <th className="text-start px-4 py-3">{tCommon('format')}</th>
                <th className="text-start px-4 py-3">{tCommon('file')}</th>
                <th className="text-end px-4 py-3">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={enableBulkDelete ? 9 : 8}
                    className="px-4 py-8 text-center text-[var(--muted)]"
                  >
                    {tDrawings('noPending')}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="border-t border-[var(--border)]">
                    {enableBulkDelete && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(d.id)}
                          onChange={() => toggleRow(d.id)}
                          className="rounded border-[var(--border)]"
                          aria-label={`${d.drawingNumber} · ${d.title}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono">{d.drawingNumber}</td>
                    <td className="px-4 py-3">{d.title}</td>
                    <td className="px-4 py-3">{tDisc(d.discipline)}</td>
                    <td className="px-4 py-3">{d.revision}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(d.status)}`}
                      >
                        {tStatus.has(d.status) ? tStatus(d.status) : d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{fileExtensionFromUrl(d.fileUrl)}</td>
                    <td className="px-4 py-3">
                      <DrawingFileButton drawing={d} />
                    </td>
                    <td className="px-4 py-3 text-end space-x-2 rtl:space-x-reverse whitespace-nowrap">
                      {d.status === 'PENDING_REVIEW' && (
                        <>
                          <button
                            type="button"
                            className="btn-success !px-2 !py-1 !text-xs"
                            onClick={() =>
                              setReviewModal({
                                drawing: d,
                                decision: 'APPROVED_FOR_CONSTRUCTION',
                              })
                            }
                          >
                            {tCommon('approve')}
                          </button>
                          <button
                            type="button"
                            className="btn-danger !px-2 !py-1 !text-xs"
                            onClick={() =>
                              setReviewModal({
                                drawing: d,
                                decision: 'REVISION_REQUESTED',
                              })
                            }
                          >
                            {tDrawings('requestRevision')}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn-secondary !px-2 !py-1 !text-xs"
                        onClick={() => openEdit(d)}
                      >
                        {tCommon('edit')}
                      </button>
                      <button
                        type="button"
                        className="btn-danger !px-2 !py-1 !text-xs"
                        onClick={() => requestRemoveDrawing(d)}
                      >
                        {tCommon('delete')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {deleteConfirm && (
        <ConfirmDialog
          open
          title={
            deleteConfirm.type === 'bulk'
              ? t('confirmDeleteTitleBulk', { count: deleteConfirm.count })
              : t('confirmDeleteTitle')
          }
          message={
            deleteConfirm.type === 'bulk'
              ? t('confirmBulkDelete', { count: deleteConfirm.count })
              : t('confirmDeleteDrawing', {
                  number: deleteConfirm.drawing.drawingNumber,
                  title: deleteConfirm.drawing.title,
                })
          }
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          loading={deleteLoading}
          onConfirm={executeDeleteConfirm}
          onCancel={() => {
            if (!deleteLoading) setDeleteConfirm(null);
          }}
        />
      )}

      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="text-lg font-medium mb-2 text-[var(--text)]">
              {reviewModal.decision === 'APPROVED_FOR_CONSTRUCTION'
                ? tDrawings('approveDrawing')
                : tDrawings('requestRevision')}
            </h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              {reviewModal.drawing.drawingNumber} · {reviewModal.drawing.title} ·{' '}
              {tCommon('revision')} {reviewModal.drawing.revision}
            </p>
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
                disabled={reviewLoading || !comments.trim()}
                className="btn-primary"
              >
                {tCommon('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-[var(--danger)]">{message}</p>}
    </div>
  );
}
