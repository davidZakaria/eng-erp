'use client';

import { Fragment, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BOQItem } from '@/lib/types';
import { clientApi } from '@/lib/client-api';
import { groupBoqByDivision } from '@/lib/boq-grouping';

function progressPercent(item: BOQItem): number {
  if (item.plannedQuantity <= 0) return 0;
  return Math.round((item.actualQuantity / item.plannedQuantity) * 100);
}

function BoqItemRow({
  item,
  onExecute,
}: {
  item: BOQItem;
  onExecute: (item: BOQItem) => void;
}) {
  const t = useTranslations('execution');
  const tCommon = useTranslations('common');
  const pct = progressPercent(item);
  const atOrOverBaseline = pct >= 100;

  return (
    <tr className="border-t border-[var(--border)] text-[var(--text)]">
      <td className="px-4 py-3 font-mono">{item.itemCode}</td>
      <td className="px-4 py-3">{item.description}</td>
      <td className="px-4 py-3 text-end">
        {item.plannedQuantity} {item.unit}
      </td>
      <td className="px-4 py-3 text-end">
        {item.actualQuantity} {item.unit}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 rounded bg-[var(--surface-elevated)] overflow-hidden">
            <div
              className={`h-full transition-all ${
                atOrOverBaseline ? 'bg-red-600' : 'bg-[var(--accent)]'
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span
            className={`text-xs w-10 text-end ${
              atOrOverBaseline
                ? 'text-[var(--danger)] font-semibold'
                : 'text-[var(--muted)]'
            }`}
          >
            {pct}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-end">
        <button
          type="button"
          disabled={atOrOverBaseline}
          onClick={() => onExecute(item)}
          className="btn-secondary !px-3 !py-1 !text-xs"
        >
          {t('logInstall')}
        </button>
      </td>
    </tr>
  );
}

export function BoqExecutionTab() {
  const t = useTranslations('execution');
  const tDrawings = useTranslations('drawings');
  const tCsi = useTranslations('csiDivisions');
  const tCommon = useTranslations('common');
  const [items, setItems] = useState<BOQItem[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    clientApi<BOQItem[]>('/boq/items')
      .then(setItems)
      .catch(() => {});
  }, []);

  async function executeQuantity(item: BOQItem) {
    setMessage('');
    const remaining = item.plannedQuantity - item.actualQuantity;
    const qty = Math.min(remaining, Math.max(remaining * 0.1, 1));

    try {
      const updated = await clientApi<BOQItem>('/boq/execute-quantity', {
        method: 'POST',
        body: JSON.stringify({
          boqItemId: item.id,
          installedQuantity: qty,
        }),
      });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setMessage(`${item.itemCode}: +${qty} ${item.unit}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('budgetExceeded'));
    }
  }

  const groups = groupBoqByDivision(items);

  function divisionTitle(code: string): string {
    return tCsi.has(code) ? tCsi(code) : tDrawings('unclassifiedDivision');
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <p className="px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)]">
        {t('executionHint')}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
            <tr>
              <th className="text-start px-4 py-3 font-medium">{t('itemCode')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('description')}</th>
              <th className="text-end px-4 py-3 font-medium">{t('planned')}</th>
              <th className="text-end px-4 py-3 font-medium">{t('actual')}</th>
              <th className="text-start px-4 py-3 font-medium min-w-[180px]">
                {tCommon('progress')}
              </th>
              <th className="text-end px-4 py-3 font-medium">{tCommon('action')}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={`div-${group.divisionCode}`}>
                <tr className="bg-[var(--surface-elevated)]/60 border-t border-[var(--border)]">
                  <td
                    colSpan={6}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                  >
                    {tDrawings('divisionGroup', {
                      code: group.divisionCode,
                      title: divisionTitle(group.divisionCode),
                    })}
                  </td>
                </tr>
                {group.items.map((item) => (
                  <BoqItemRow key={item.id} item={item} onExecute={executeQuantity} />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {message && (
        <p className="px-4 py-3 text-sm text-[var(--muted)] border-t border-[var(--border)]">
          {message}
        </p>
      )}
    </section>
  );
}
