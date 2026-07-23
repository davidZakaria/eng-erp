'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PourClearance } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

interface ChecklistState {
  formworkApproved: boolean;
  rebarApproved: boolean;
  ptCablesXApproved: boolean;
  ptCablesYApproved: boolean;
}

export function PourClearanceChecklist() {
  const t = useTranslations('structural');
  const tStatus = useTranslations('statuses');
  const [clearances, setClearances] = useState<PourClearance[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [checklist, setChecklist] = useState<ChecklistState>({
    formworkApproved: false,
    rebarApproved: false,
    ptCablesXApproved: false,
    ptCablesYApproved: false,
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const clearance =
    clearances.find((c) => c.id === selectedId) ?? clearances[0] ?? null;

  useEffect(() => {
    clientApi<PourClearance[]>('/structural/pour-clearances')
      .then((items) => {
        setClearances(items);
        const preferred =
          items.find((c) => c.zone === 'Building G1') ?? items[0];
        if (preferred) {
          setSelectedId(preferred.id);
          setChecklist({
            formworkApproved: preferred.formworkApproved,
            rebarApproved: preferred.rebarApproved,
            ptCablesXApproved: preferred.ptCablesXApproved,
            ptCablesYApproved: preferred.ptCablesYApproved,
          });
        }
      })
      .catch(() => {});
  }, []);

  function selectClearance(id: string) {
    const next = clearances.find((c) => c.id === id);
    if (!next) return;
    setSelectedId(id);
    setMessage('');
    setChecklist({
      formworkApproved: next.formworkApproved,
      rebarApproved: next.rebarApproved,
      ptCablesXApproved: next.ptCablesXApproved,
      ptCablesYApproved: next.ptCablesYApproved,
    });
  }

  const zoneLocked =
    clearance?.isLockedByNCR === true ||
    clearance?.isLockedByMEP === true ||
    clearance?.isLockedByDefect === true;

  const banners: string[] = [];
  if (clearance?.isLockedByDefect) banners.push(`🛑 ${t('lockedDefect')}`);
  if (clearance?.isLockedByNCR) banners.push(`🛑 ${t('lockedNcr')}`);
  if (clearance?.isLockedByMEP) banners.push(`🛑 ${t('lockedMep')}`);

  const allChecked =
    checklist.formworkApproved &&
    checklist.rebarApproved &&
    checklist.ptCablesXApproved &&
    checklist.ptCablesYApproved;

  async function saveChecklist() {
    if (!clearance || zoneLocked) return;
    const updated = await clientApi<PourClearance>(
      `/structural/pour-clearances/${clearance.id}/checklist`,
      {
        method: 'PATCH',
        body: JSON.stringify(checklist),
      },
    );
    setClearances((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  async function approvePour() {
    if (!clearance || !allChecked || zoneLocked) return;
    setLoading(true);
    setMessage('');
    try {
      await saveChecklist();
      const result = await clientApi<PourClearance>(
        `/structural/pour-clearances/${clearance.id}/approve`,
        { method: 'POST' },
      );
      setClearances((prev) =>
        prev.map((c) => (c.id === result.id ? result : c)),
      );
      setMessage(
        `${t('currentStatus')}: ${
          tStatus.has(result.status) ? tStatus(result.status) : result.status
        }`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setLoading(false);
    }
  }

  function toggle(key: keyof ChecklistState) {
    if (zoneLocked) return;
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!clearance) {
    return <p className="text-sm text-[var(--muted)]">{t('noRecords')}</p>;
  }

  const toggles: { key: keyof ChecklistState; label: string }[] = [
    { key: 'formworkApproved', label: t('formwork') },
    { key: 'rebarApproved', label: t('rebar') },
    { key: 'ptCablesXApproved', label: t('ptCablesX') },
    { key: 'ptCablesYApproved', label: t('ptCablesY') },
  ];

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 max-w-lg">
      {clearances.length > 1 && (
        <label className="block text-sm mb-4">
          <span className="text-[var(--muted)]">{t('pourClearance')}</span>
          <select
            value={clearance.id}
            onChange={(e) => selectClearance(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
          >
            {clearances.map((c) => (
              <option key={c.id} value={c.id}>
                {c.zone} — {c.floorLevel}
                {c.isLockedByNCR || c.isLockedByMEP || c.isLockedByDefect
                  ? ' 🔒'
                  : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {banners.map((text) => (
        <div
          key={text}
          className="mb-4 rounded border border-[var(--banner-danger-border)] bg-[var(--banner-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--banner-danger-text)]"
        >
          {text}
        </div>
      ))}

      <h3 className="text-lg font-medium mb-1 text-[var(--text)]">
        {t('pourClearance')} — {clearance.zone}
      </h3>
      <p className="text-sm text-[var(--muted)] mb-6">
        {clearance.floorLevel} · {t('currentStatus')}:{' '}
        <span className="text-[var(--text)]">
          {tStatus.has(clearance.status)
            ? tStatus(clearance.status)
            : clearance.status}
        </span>
      </p>

      <ul className="space-y-4 mb-6">
        {toggles.map(({ key, label }) => (
          <li key={key} className="flex items-center justify-between">
            <span className={zoneLocked ? 'text-[var(--muted)]' : 'text-[var(--text)]'}>
              {label}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={checklist[key]}
              aria-disabled={zoneLocked}
              disabled={zoneLocked}
              onClick={() => toggle(key)}
              className={`relative h-7 w-12 rounded-full transition ${
                zoneLocked
                  ? 'bg-[var(--border)] opacity-40 cursor-not-allowed'
                  : checklist[key]
                    ? 'bg-[var(--success)]'
                    : 'bg-[var(--border)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-[var(--toggle-knob)] shadow-sm transition ${
                  checklist[key] ? 'start-5' : 'start-0.5'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={zoneLocked}
          onClick={() =>
            saveChecklist().then(() => setMessage(t('checklistSaved')))
          }
          className="btn-secondary"
        >
          {t('saveChecklist')}
        </button>
        <button
          type="button"
          onClick={approvePour}
          disabled={
            zoneLocked || !allChecked || loading || clearance.status === 'CLEAR_TO_POUR'
          }
          className="btn-primary"
        >
          {loading ? t('approving') : t('approvePour')}
        </button>
      </div>

      {!zoneLocked && !allChecked && (
        <p className="text-xs text-[var(--muted)] mt-3">{t('checklistHint')}</p>
      )}

      {message && (
        <p className="text-sm text-[var(--muted)] mt-3">{message}</p>
      )}
    </section>
  );
}
