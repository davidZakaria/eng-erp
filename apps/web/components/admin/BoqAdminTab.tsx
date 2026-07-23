'use client';

import { FormEvent, Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BOQItem } from '@/lib/types';
import { clientApi } from '@/lib/client-api';
import { groupBoqByDivision } from '@/lib/boq-grouping';

export function BoqAdminTab() {
  const t = useTranslations('admin');
  const tExec = useTranslations('execution');
  const tDrawings = useTranslations('drawings');
  const tCsi = useTranslations('csiDivisions');
  const tCommon = useTranslations('common');
  const [items, setItems] = useState<BOQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BOQItem | null>(null);
  const [form, setForm] = useState({
    itemCode: '',
    description: '',
    unit: 'm²',
    plannedQuantity: 1,
    rateEGP: 0,
    actualQuantity: 0,
    divisionCode: '03',
  });

  async function load() {
    setLoading(true);
    try {
      const data = await clientApi<BOQItem[]>('/boq/items');
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const groups = useMemo(() => groupBoqByDivision(items), [items]);

  function divisionTitle(code: string): string {
    return tCsi.has(code) ? tCsi(code) : tDrawings('unclassifiedDivision');
  }

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm({
      itemCode: '',
      description: '',
      unit: 'm²',
      plannedQuantity: 1,
      rateEGP: 0,
      actualQuantity: 0,
      divisionCode: '03',
    });
  }

  function openEdit(item: BOQItem) {
    setEditing(item);
    setCreating(false);
    setForm({
      itemCode: item.itemCode,
      description: item.description,
      unit: item.unit,
      plannedQuantity: item.plannedQuantity,
      rateEGP: item.rateEGP,
      actualQuantity: item.actualQuantity,
      divisionCode: item.divisionCode ?? '03',
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      if (creating) {
        await clientApi('/boq/items', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      } else if (editing) {
        await clientApi(`/boq/items/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('saveFailed'));
    }
  }

  async function removeItem(item: BOQItem) {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await clientApi(`/boq/items/${item.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('saveFailed'));
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{tCommon('loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">{t('boqManageHint')}</p>
        <button type="button" className="btn-primary" onClick={openCreate}>
          {t('addBoqLine')}
        </button>
      </div>

      {(creating || editing) && (
        <form onSubmit={onSubmit} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tExec('itemCode')}</span>
            <input required value={form.itemCode} onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 font-mono" />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">{tCommon('description')}</span>
            <input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('divisionCode')}</span>
            <input value={form.divisionCode} onChange={(e) => setForm((f) => ({ ...f, divisionCode: e.target.value }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('unit')}</span>
            <input required value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tExec('planned')}</span>
            <input required type="number" min={0} step="any" value={form.plannedQuantity} onChange={(e) => setForm((f) => ({ ...f, plannedQuantity: Number(e.target.value) }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('rateEgp')}</span>
            <input required type="number" min={0} step="any" value={form.rateEGP} onChange={(e) => setForm((f) => ({ ...f, rateEGP: Number(e.target.value) }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2" />
          </label>
          {editing && (
            <label className="block text-sm">
              <span className="text-[var(--muted)]">{tExec('actual')}</span>
              <input type="number" min={0} step="any" value={form.actualQuantity} onChange={(e) => setForm((f) => ({ ...f, actualQuantity: Number(e.target.value) }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2" />
            </label>
          )}
          <div className="sm:col-span-3 flex gap-2">
            <button type="submit" className="btn-primary">{tCommon('save')}</button>
            <button type="button" className="btn-secondary" onClick={() => { setCreating(false); setEditing(null); }}>{tCommon('cancel')}</button>
          </div>
        </form>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3">{tExec('itemCode')}</th>
                <th className="text-start px-4 py-3">{tCommon('description')}</th>
                <th className="text-end px-4 py-3">{tExec('planned')}</th>
                <th className="text-end px-4 py-3">{tExec('actual')}</th>
                <th className="text-end px-4 py-3">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={`div-${group.divisionCode}`}>
                  <tr className="bg-[var(--surface-elevated)]/60">
                    <td colSpan={5} className="px-4 py-2 text-xs font-semibold uppercase text-[var(--muted)]">
                      {tDrawings('divisionGroup', { code: group.divisionCode, title: divisionTitle(group.divisionCode) })}
                    </td>
                  </tr>
                  {group.items.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3 font-mono">{item.itemCode}</td>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3 text-end">{item.plannedQuantity} {item.unit}</td>
                      <td className="px-4 py-3 text-end">{item.actualQuantity} {item.unit}</td>
                      <td className="px-4 py-3 text-end space-x-2 rtl:space-x-reverse">
                        <button type="button" className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => openEdit(item)}>{tCommon('edit')}</button>
                        <button type="button" className="btn-danger !px-2 !py-1 !text-xs" onClick={() => removeItem(item)}>{tCommon('delete')}</button>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {message && <p className="text-sm text-[var(--danger)]">{message}</p>}
    </div>
  );
}
