'use client';

import { useEffect, useState } from 'react';
import { PourClearance } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

interface ChecklistState {
  formworkApproved: boolean;
  rebarApproved: boolean;
  ptCablesXApproved: boolean;
  ptCablesYApproved: boolean;
}

export function PourClearanceChecklist() {
  const [clearance, setClearance] = useState<PourClearance | null>(null);
  const [checklist, setChecklist] = useState<ChecklistState>({
    formworkApproved: false,
    rebarApproved: false,
    ptCablesXApproved: false,
    ptCablesYApproved: false,
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clientApi<PourClearance[]>('/structural/pour-clearances')
      .then((items) => {
        const g1 = items.find((c) => c.zone === 'Building G1') ?? items[0];
        if (g1) {
          setClearance(g1);
          setChecklist({
            formworkApproved: g1.formworkApproved,
            rebarApproved: g1.rebarApproved,
            ptCablesXApproved: g1.ptCablesXApproved,
            ptCablesYApproved: g1.ptCablesYApproved,
          });
        }
      })
      .catch(() => {});
  }, []);

  const allChecked =
    checklist.formworkApproved &&
    checklist.rebarApproved &&
    checklist.ptCablesXApproved &&
    checklist.ptCablesYApproved;

  async function saveChecklist() {
    if (!clearance) return;
    await clientApi(`/structural/pour-clearances/${clearance.id}/checklist`, {
      method: 'PATCH',
      body: JSON.stringify(checklist),
    });
  }

  async function approvePour() {
    if (!clearance || !allChecked) return;
    setLoading(true);
    setMessage('');
    try {
      await saveChecklist();
      const result = await clientApi<PourClearance>(
        `/structural/pour-clearances/${clearance.id}/approve`,
        { method: 'POST' },
      );
      setClearance(result);
      setMessage(`Status: ${result.status}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setLoading(false);
    }
  }

  function toggle(key: keyof ChecklistState) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!clearance) {
    return (
      <p className="text-sm text-[var(--muted)]">No pour clearance records found.</p>
    );
  }

  const toggles: { key: keyof ChecklistState; label: string }[] = [
    { key: 'formworkApproved', label: 'Formwork' },
    { key: 'rebarApproved', label: 'Rebar' },
    { key: 'ptCablesXApproved', label: 'PT Cables X' },
    { key: 'ptCablesYApproved', label: 'PT Cables Y' },
  ];

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 p-6 max-w-lg">
      <h3 className="text-lg font-medium mb-1">Pour Clearance — {clearance.zone}</h3>
      <p className="text-sm text-[var(--muted)] mb-6">
        {clearance.floorLevel} · Current status:{' '}
        <span className="text-[var(--text)]">{clearance.status}</span>
      </p>

      <ul className="space-y-4 mb-6">
        {toggles.map(({ key, label }) => (
          <li key={key} className="flex items-center justify-between">
            <span>{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={checklist[key]}
              onClick={() => toggle(key)}
              className={`relative h-7 w-12 rounded-full transition ${
                checklist[key] ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${
                  checklist[key] ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => saveChecklist().then(() => setMessage('Checklist saved.'))}
          className="rounded border border-[var(--border)] px-4 py-2 text-sm"
        >
          Save Checklist
        </button>
        <button
          onClick={approvePour}
          disabled={!allChecked || loading || clearance.status === 'CLEAR_TO_POUR'}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Approving…' : 'Approve Concrete Pour'}
        </button>
      </div>

      {!allChecked && (
        <p className="text-xs text-[var(--muted)] mt-3">
          All four checklist items must be approved before pour clearance.
        </p>
      )}

      {message && (
        <p className="text-sm text-[var(--muted)] mt-3">{message}</p>
      )}
    </section>
  );
}
