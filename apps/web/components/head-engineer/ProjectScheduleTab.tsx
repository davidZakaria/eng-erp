'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { clientApi } from '@/lib/client-api';
import { ScheduleLine, SchedulePlan } from '@/lib/types';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '—';
  }
}

function progressTone(status: string | null, endDate: string | null): string {
  if (status === 'DONE') return 'text-[var(--success)]';
  if (!endDate) return 'text-[var(--muted)]';
  const overdue = new Date(endDate).getTime() < Date.now();
  return overdue ? 'text-[var(--danger)] font-semibold' : 'text-[var(--text)]';
}

export function ProjectScheduleTab({ canImport = false }: { canImport?: boolean }) {
  const t = useTranslations('schedulePlan');
  const tCommon = useTranslations('common');
  const [plans, setPlans] = useState<SchedulePlan[]>([]);
  const [activePlanId, setActivePlanId] = useState('');
  const [lines, setLines] = useState<ScheduleLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);

  const activePlan = useMemo(
    () => plans.find((p) => p.id === activePlanId) ?? null,
    [plans, activePlanId],
  );

  const loadPlans = useCallback(async () => {
    const rows = await clientApi<SchedulePlan[]>('/schedule/plans');
    setPlans(rows);
    if (rows[0] && !activePlanId) {
      setActivePlanId(rows[0].id);
    }
    return rows;
  }, [activePlanId]);

  const loadPlanLines = useCallback(async (planId: string) => {
    const plan = await clientApi<SchedulePlan & { lines: ScheduleLine[] }>(
      `/schedule/plans/${planId}`,
    );
    setLines(plan.lines ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadPlans()
      .then((rows) => {
        if (rows[0]) return loadPlanLines(rows[0].id);
      })
      .catch(() => {
        setPlans([]);
        setLines([]);
      })
      .finally(() => setLoading(false));
  }, [loadPlans, loadPlanLines]);

  useEffect(() => {
    if (!activePlanId) return;
    loadPlanLines(activePlanId).catch(() => setLines([]));
  }, [activePlanId, loadPlanLines]);

  async function reimportExcel() {
    setImporting(true);
    setMessage('');
    try {
      const result = await clientApi<{ planId: string; importedLines: number }>(
        '/schedule/import/seed',
        { method: 'POST' },
      );
      setMessage(t('importSuccess', { count: result.importedLines }));
      const rows = await loadPlans();
      setActivePlanId(result.planId || rows[0]?.id || '');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('importFailed'));
    } finally {
      setImporting(false);
    }
  }

  const buildings = activePlan?.buildingCodes ?? [];

  let lastCategory = '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--muted)] max-w-3xl">{t('hint')}</p>
          {activePlan && (
            <p className="text-sm text-[var(--text)] mt-1">
              {activePlan.projectLabel ?? activePlan.name}
              {activePlan.planDeadline
                ? ` · ${t('deadline')}: ${formatDate(activePlan.planDeadline)}`
                : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {plans.length > 1 && (
            <select
              value={activePlanId}
              onChange={(e) => setActivePlanId(e.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          )}
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

      {message && <p className="text-sm text-[var(--text)]">{message}</p>}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">{tCommon('loading')}</p>
      ) : lines.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t('empty')}</p>
      ) : (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1200px]">
              <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 text-start">{t('itemCode')}</th>
                  <th className="px-3 py-2 text-start min-w-[240px]">
                    {tCommon('description')}
                  </th>
                  <th className="px-3 py-2 text-start">{t('unit')}</th>
                  {buildings.map((b) => (
                    <th key={b} colSpan={5} className="px-3 py-2 text-center border-s border-[var(--border)]">
                      {b}
                    </th>
                  ))}
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <th colSpan={3} />
                  {buildings.map((b) => (
                    <Fragment key={`${b}-sub`}>
                      <th className="px-2 py-1 text-end">{t('qty')}</th>
                      <th className="px-2 py-1 text-end">{t('rate')}</th>
                      <th className="px-2 py-1 text-end">{t('days')}</th>
                      <th className="px-2 py-1 text-start">{t('start')}</th>
                      <th className="px-2 py-1 text-start border-e border-[var(--border)]">
                        {t('end')}
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const showCategory =
                    line.categoryLabel && line.categoryLabel !== lastCategory;
                  if (showCategory) lastCategory = line.categoryLabel ?? '';
                  return (
                    <Fragment key={line.id}>
                      {showCategory && (
                        <tr className="bg-[var(--surface-elevated)]/70">
                          <td
                            colSpan={3 + buildings.length * 5}
                            className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]"
                          >
                            {line.categoryLabel}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-[var(--border)] text-[var(--text)]">
                        <td className="px-3 py-2 font-mono">{line.itemCode}</td>
                        <td className="px-3 py-2">{line.description}</td>
                        <td className="px-3 py-2">{line.unit ?? '—'}</td>
                        {buildings.map((code) => {
                          const p =
                            line.progress.find((x) => x.buildingCode === code) ??
                            null;
                          return (
                            <Fragment key={`${line.id}-${code}`}>
                              <td className="px-2 py-2 text-end">
                                {p?.quantity ?? '—'}
                              </td>
                              <td className="px-2 py-2 text-end">
                                {p?.rateEGP?.toLocaleString() ?? '—'}
                              </td>
                              <td className="px-2 py-2 text-end">
                                {p?.durationDays ?? '—'}
                              </td>
                              <td className="px-2 py-2">{formatDate(p?.startDate ?? null)}</td>
                              <td
                                className={`px-2 py-2 border-e border-[var(--border)] ${progressTone(p?.status ?? null, p?.endDate ?? null)}`}
                              >
                                {p?.status === 'DONE'
                                  ? t('done')
                                  : formatDate(p?.endDate ?? null)}
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
