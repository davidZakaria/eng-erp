'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { clientApi } from '@/lib/client-api';
import {
  PourTrackerEntry,
  REBAR_DIAMETERS,
  TrackerStatus,
} from '@/lib/types';

function totalRebarKg(rebar: Record<string, number>): number {
  return Object.values(rebar).reduce((sum, n) => sum + (n || 0), 0);
}

function statusClass(status: TrackerStatus): string {
  if (status === 'DONE') {
    return 'bg-[var(--chip-success-bg)] text-[var(--chip-success-text)]';
  }
  if (status === 'IN_PROGRESS') {
    return 'bg-[var(--chip-warn-bg)] text-[var(--chip-warn-text)]';
  }
  return 'bg-[var(--surface-elevated)] text-[var(--muted)]';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export function ConcreteRebarTrackerTab({ canImport = false }: { canImport?: boolean }) {
  const t = useTranslations('pourTracker');
  const tCommon = useTranslations('common');
  const [entries, setEntries] = useState<PourTrackerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await clientApi<PourTrackerEntry[]>('/pour-tracker');
      setEntries(rows);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reimportExcel() {
    setImporting(true);
    setMessage('');
    try {
      const result = await clientApi<{ imported: number }>('/pour-tracker/import/seed', {
        method: 'POST',
      });
      setMessage(t('importSuccess', { count: result.imported }));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('importFailed'));
    } finally {
      setImporting(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, PourTrackerEntry[]>();
    for (const entry of entries) {
      const key = entry.buildingLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return [...map.entries()];
  }, [entries]);

  const totals = useMemo(() => {
    const rebar = entries.reduce((s, e) => s + totalRebarKg(e.rebarByDiameter), 0);
    const concrete = entries.reduce((s, e) => s + (e.concreteM3 ?? 0), 0);
    const done = entries.filter((e) => e.status === 'DONE').length;
    return { rebar, concrete, done, count: entries.length };
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)] max-w-2xl">{t('hint')}</p>
        <div className="flex flex-wrap gap-2">
          {canImport && (
            <button
              type="button"
              className="btn-secondary !text-xs"
              disabled={importing}
              onClick={() => void reimportExcel()}
            >
              {importing ? tCommon('loading') : t('reimportExcel')}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--muted)]">{t('totalEntries')}</p>
          <p className="text-lg font-semibold text-[var(--text)]">{totals.count}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--muted)]">{t('doneEntries')}</p>
          <p className="text-lg font-semibold text-[var(--success)]">{totals.done}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--muted)]">{t('totalRebarKg')}</p>
          <p className="text-lg font-semibold text-[var(--text)]">
            {totals.rebar.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--muted)]">{t('totalConcreteM3')}</p>
          <p className="text-lg font-semibold text-[var(--text)]">
            {totals.concrete.toLocaleString()}
          </p>
        </div>
      </div>

      {message && <p className="text-sm text-[var(--text)]">{message}</p>}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">{tCommon('loading')}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t('empty')}</p>
      ) : (
        grouped.map(([building, rows]) => (
          <section
            key={building}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          >
            <h3 className="px-4 py-3 border-b border-[var(--border)] text-sm font-semibold text-[var(--text)]">
              {building}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1100px]">
                <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2 text-start">{t('halfZone')}</th>
                    <th className="px-3 py-2 text-start">{t('floor')}</th>
                    <th className="px-3 py-2 text-start">{t('element')}</th>
                    {REBAR_DIAMETERS.map((d) => (
                      <th key={d} className="px-2 py-2 text-end">
                        Ø{d}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-end">{t('concreteM3')}</th>
                    <th className="px-3 py-2 text-end">{t('rebarCost')}</th>
                    <th className="px-3 py-2 text-end">{t('concreteCost')}</th>
                    <th className="px-3 py-2 text-start">{t('plannedEnd')}</th>
                    <th className="px-3 py-2 text-start">{t('actualPour')}</th>
                    <th className="px-3 py-2 text-start">{tCommon('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-t border-[var(--border)] text-[var(--text)]"
                    >
                      <td className="px-3 py-2">{entry.halfZone ?? '—'}</td>
                      <td className="px-3 py-2">{entry.floorLevel ?? '—'}</td>
                      <td className="px-3 py-2 max-w-[180px]">
                        {entry.elementLabel ?? entry.elementType}
                      </td>
                      {REBAR_DIAMETERS.map((d) => (
                        <td key={d} className="px-2 py-2 text-end font-mono">
                          {entry.rebarByDiameter[d]
                            ? entry.rebarByDiameter[d].toLocaleString()
                            : '—'}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-end">
                        {entry.concreteM3 ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {entry.rebarCostEGP?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {entry.concreteCostEGP?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-3 py-2">{formatDate(entry.plannedEnd)}</td>
                      <td className="px-3 py-2">{formatDate(entry.actualPourDate)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass(entry.status)}`}
                        >
                          {t(`status.${entry.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
