'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  PourTrackerEntry,
  REBAR_DIAMETERS,
  TrackerStatus,
} from '@/lib/types';
import { clientApi } from '@/lib/client-api';

const EMPTY_REBAR = Object.fromEntries(REBAR_DIAMETERS.map((d) => [d, '']));

export function SitePourTrackerTab() {
  const t = useTranslations('pourTracker');
  const tSite = useTranslations('site');
  const tCommon = useTranslations('common');
  const [entries, setEntries] = useState<PourTrackerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    buildingLabel: 'G1 / J',
    halfZone: '',
    floorLevel: '',
    elementType: 'COLUMNS',
    elementLabel: '',
    concreteM3: '',
    actualPourDate: new Date().toISOString().slice(0, 10),
    status: 'DONE' as TrackerStatus,
    notes: '',
    rebar: { ...EMPTY_REBAR },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await clientApi<PourTrackerEntry[]>('/pour-tracker'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const buildings = useMemo(
    () => [...new Set(entries.map((e) => e.buildingLabel))],
    [entries],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const rebarByDiameter: Record<string, number> = {};
    for (const d of REBAR_DIAMETERS) {
      const val = Number(form.rebar[d]);
      if (val > 0) rebarByDiameter[d] = val;
    }

    try {
      await clientApi('/pour-tracker', {
        method: 'POST',
        body: JSON.stringify({
          buildingLabel: form.buildingLabel.trim(),
          halfZone: form.halfZone.trim() || undefined,
          floorLevel: form.floorLevel.trim() || undefined,
          elementType: form.elementType,
          elementLabel: form.elementLabel.trim() || undefined,
          rebarByDiameter,
          concreteM3: form.concreteM3 ? Number(form.concreteM3) : undefined,
          actualPourDate: new Date(form.actualPourDate).toISOString(),
          status: form.status,
          notes: form.notes.trim() || undefined,
        }),
      });
      setMessage(tSite('pourLogged'));
      setForm((f) => ({
        ...f,
        elementLabel: '',
        concreteM3: '',
        notes: '',
        rebar: { ...EMPTY_REBAR },
      }));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : tSite('pourFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-[var(--muted)]">{t('siteHint')}</p>

      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4"
      >
        <h3 className="text-sm font-medium text-[var(--text)]">{tSite('logPour')}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('building')}</span>
            <input
              list="building-options"
              required
              value={form.buildingLabel}
              onChange={(e) => setForm((f) => ({ ...f, buildingLabel: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
            <datalist id="building-options">
              {buildings.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('halfZone')}</span>
            <input
              value={form.halfZone}
              onChange={(e) => setForm((f) => ({ ...f, halfZone: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('floor')}</span>
            <input
              value={form.floorLevel}
              onChange={(e) => setForm((f) => ({ ...f, floorLevel: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('element')}</span>
            <select
              value={form.elementType}
              onChange={(e) => setForm((f) => ({ ...f, elementType: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            >
              <option value="COLUMNS">{t('elementColumns')}</option>
              <option value="SLAB">{t('elementSlab')}</option>
              <option value="COMBINED">{t('elementCombined')}</option>
              <option value="FOUNDATION">{t('elementFoundation')}</option>
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-[var(--muted)]">{t('elementDetail')}</span>
          <input
            value={form.elementLabel}
            onChange={(e) => setForm((f) => ({ ...f, elementLabel: e.target.value }))}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
          />
        </label>

        <div>
          <p className="text-xs font-medium text-[var(--muted)] mb-2">{t('rebarGrid')}</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {REBAR_DIAMETERS.map((d) => (
              <label key={d} className="block text-xs">
                <span className="text-[var(--muted)]">Ø{d} kg</span>
                <input
                  type="number"
                  min={0}
                  value={form.rebar[d]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      rebar: { ...f.rebar, [d]: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1.5"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('concreteM3')}</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={form.concreteM3}
              onChange={(e) => setForm((f) => ({ ...f, concreteM3: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('actualPour')}</span>
            <input
              type="date"
              required
              value={form.actualPourDate}
              onChange={(e) => setForm((f) => ({ ...f, actualPourDate: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tCommon('status')}</span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as TrackerStatus }))
              }
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            >
              <option value="PLANNED">{t('status.PLANNED')}</option>
              <option value="IN_PROGRESS">{t('status.IN_PROGRESS')}</option>
              <option value="DONE">{t('status.DONE')}</option>
            </select>
          </label>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? tCommon('loading') : tSite('submitPour')}
        </button>
        {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
      </form>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <h3 className="px-4 py-3 border-b border-[var(--border)] text-sm font-medium">
          {t('recentEntries')}
        </h3>
        {loading ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">{tCommon('loading')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 text-start">{t('building')}</th>
                  <th className="px-3 py-2 text-start">{t('floor')}</th>
                  <th className="px-3 py-2 text-start">{t('element')}</th>
                  <th className="px-3 py-2 text-end">{t('concreteM3')}</th>
                  <th className="px-3 py-2 text-start">{t('actualPour')}</th>
                  <th className="px-3 py-2 text-start">{tCommon('status')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 20).map((entry) => (
                  <tr key={entry.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">{entry.buildingLabel}</td>
                    <td className="px-3 py-2">{entry.floorLevel ?? '—'}</td>
                    <td className="px-3 py-2">{entry.elementLabel ?? entry.elementType}</td>
                    <td className="px-3 py-2 text-end">{entry.concreteM3 ?? '—'}</td>
                    <td className="px-3 py-2">
                      {entry.actualPourDate
                        ? new Date(entry.actualPourDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-3 py-2">{t(`status.${entry.status}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
