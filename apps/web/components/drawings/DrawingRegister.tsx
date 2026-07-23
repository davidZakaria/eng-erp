'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Drawing, ItemStatus } from '@/lib/types';
import { clientApi } from '@/lib/client-api';
import { fileExtensionFromUrl } from '@/lib/drawing-files';

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

export function DrawingRegister() {
  const t = useTranslations('drawings');
  const tCommon = useTranslations('common');
  const tDisc = useTranslations('disciplines');
  const tStatus = useTranslations('statuses');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sheetCodeFilter, setSheetCodeFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');

  const [status, setStatus] = useState('');

  async function withdrawDrawing(drawing: Drawing) {
    if (!confirm(t('confirmWithdraw'))) return;
    try {
      await clientApi(`/drawings/${drawing.id}`, { method: 'DELETE' });
      setStatus(t('submissionWithdrawn'));
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t('registrationFailed'));
    }
  }

  async function load() {
    setLoading(true);
    try {
      const data = await clientApi<Drawing[]>('/drawings');
      setDrawings(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const sheetCodes = useMemo(
    () =>
      [...new Set(drawings.map((d) => d.disciplineCode).filter(Boolean) as string[])].sort(),
    [drawings],
  );

  const packages = useMemo(
    () =>
      [...new Set(drawings.map((d) => d.packageName).filter(Boolean) as string[])].sort(),
    [drawings],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drawings.filter((d) => {
      if (statusFilter && d.status !== statusFilter) return false;
      if (sheetCodeFilter && d.disciplineCode !== sheetCodeFilter) return false;
      if (packageFilter && d.packageName !== packageFilter) return false;
      if (!q) return true;
      return (
        d.drawingNumber.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        (d.sheetNumber ?? '').toLowerCase().includes(q)
      );
    });
  }, [drawings, search, statusFilter, sheetCodeFilter, packageFilter]);

  const statusOptions: ItemStatus[] = [
    'PENDING_REVIEW',
    'APPROVED_FOR_CONSTRUCTION',
    'REVISION_REQUESTED',
    'SUPERSEDED',
  ];

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{t('loadingRegister')}</p>;
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden text-[var(--text)]">
      <div className="px-4 py-3 border-b border-[var(--border)] flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-medium text-[var(--text)]">{t('register')}</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchRegister')}
            className="rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-1.5 text-xs min-w-[160px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-2 py-1.5 text-xs"
          >
            <option value="">{t('allStatuses')}</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {tStatus.has(status) ? tStatus(status) : status}
              </option>
            ))}
          </select>
          <select
            value={sheetCodeFilter}
            onChange={(e) => setSheetCodeFilter(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-2 py-1.5 text-xs"
          >
            <option value="">{t('allSheetCodes')}</option>
            {sheetCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-2 py-1.5 text-xs max-w-[180px]"
          >
            <option value="">{t('allPackages')}</option>
            {packages.map((pkg) => (
              <option key={pkg} value={pkg}>
                {pkg}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)]">
        {t('registerCount', { shown: filtered.length, total: drawings.length })}
      </p>
      {status && (
        <p className="px-4 py-2 text-xs text-[var(--text)] border-b border-[var(--border)]">
          {status}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
            <tr>
              <th className="text-start px-4 py-3 font-medium">{tCommon('number')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('sheetCode')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('sheetNumber')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('title')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('discipline')}</th>
              <th className="text-start px-4 py-3 font-medium">{t('scale')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('revision')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('format')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('status')}</th>
              <th className="text-end px-4 py-3 font-medium">{tCommon('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[var(--muted)]">
                  {t('noDrawingsMatch')}
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="border-t border-[var(--border)] text-[var(--text)]">
                  <td className="px-4 py-3 font-mono text-[var(--text)]">{d.drawingNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.disciplineCode ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{d.sheetNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text)]">{d.title}</td>
                  <td className="px-4 py-3 text-[var(--text)]">{tDisc(d.discipline)}</td>
                  <td className="px-4 py-3 text-xs">{d.scale ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {tCommon('revision')} {d.revision}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[var(--surface-elevated)] px-2 py-0.5 text-xs font-medium text-[var(--text)]">
                      {fileExtensionFromUrl(d.fileUrl)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-semibold ${statusBadgeClass(d.status)}`}
                    >
                      {tStatus.has(d.status) ? tStatus(d.status) : d.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    {d.status === 'PENDING_REVIEW' && (
                      <button
                        type="button"
                        className="btn-danger !px-2 !py-1 !text-xs"
                        onClick={() => withdrawDrawing(d)}
                      >
                        {t('withdrawSubmission')}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
