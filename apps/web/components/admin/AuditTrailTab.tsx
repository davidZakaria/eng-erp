'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { clientApi } from '@/lib/client-api';
import { AuditLogRow } from '@/lib/types';

function pretty(value: unknown) {
  if (value == null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditTrailTab() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [diffRow, setDiffRow] = useState<AuditLogRow | null>(null);

  useEffect(() => {
    clientApi<AuditLogRow[]>('/audit-logs?limit=200')
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{tCommon('loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[var(--text)]">{t('auditTrail')}</h3>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3">{t('timestamp')}</th>
                <th className="text-start px-4 py-3">{t('tableName')}</th>
                <th className="text-start px-4 py-3">{t('recordId')}</th>
                <th className="text-start px-4 py-3">{t('action')}</th>
                <th className="text-start px-4 py-3">{t('userId')}</th>
                <th className="text-end px-4 py-3">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                    {t('noAudit')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)] text-[var(--text)]">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.targetTable}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.targetId ?? '—'}
                    </td>
                    <td className="px-4 py-3">{row.action}</td>
                    <td className="px-4 py-3">
                      {row.user?.fullName ?? row.userId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-1 !text-xs"
                        onClick={() => setDiffRow(row)}
                      >
                        {t('viewDiff')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {diffRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-4xl rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h4 className="text-lg font-medium text-[var(--text)]">
                {t('viewDiff')} · {diffRow.targetTable}
              </h4>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDiffRow(null)}
              >
                {tCommon('cancel')}
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] mb-2">
                  {t('oldData')}
                </p>
                <pre className="rounded border border-[var(--border)] bg-[var(--input-bg)] p-3 text-xs text-[var(--text)] overflow-auto whitespace-pre-wrap">
                  {pretty(diffRow.oldData)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] mb-2">
                  {t('newData')}
                </p>
                <pre className="rounded border border-[var(--border)] bg-[var(--input-bg)] p-3 text-xs text-[var(--text)] overflow-auto whitespace-pre-wrap">
                  {pretty(diffRow.newData ?? diffRow.metadata)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
