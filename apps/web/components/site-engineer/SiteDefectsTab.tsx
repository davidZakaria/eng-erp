'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SiteDefect } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

function severityClass(severity: string): string {
  if (severity === 'HIGH') return 'text-[var(--danger)] font-semibold';
  if (severity === 'MEDIUM') return 'text-[var(--chip-warn-text)] font-semibold';
  return 'text-[var(--muted)]';
}

export function SiteDefectsTab() {
  const t = useTranslations('site');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('statuses');
  const tSeverity = useTranslations('severity');
  const [defects, setDefects] = useState<SiteDefect[]>([]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Building G1');
  const [severity, setSeverity] = useState('MEDIUM');
  const [message, setMessage] = useState('');

  async function load() {
    const data = await clientApi<SiteDefect[]>('/defects');
    setDefects(data);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      await clientApi('/defects', {
        method: 'POST',
        body: JSON.stringify({ description, location, severity }),
      });
      setDescription('');
      setMessage(t('defectCreated'));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('defectFailed'));
    }
  }

  async function markFixed(id: string) {
    await clientApi(`/defects/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'FIXED' }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 grid gap-3 sm:grid-cols-2"
      >
        <h3 className="sm:col-span-2 text-sm font-medium text-[var(--text)]">
          {t('reportDefect')}
        </h3>
        <label className="block text-sm sm:col-span-2">
          <span className="text-[var(--muted)]">{tCommon('description')}</span>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">{tCommon('location')}</span>
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">{tCommon('severity')}</span>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
          >
            <option value="HIGH">{tSeverity('HIGH')}</option>
            <option value="MEDIUM">{tSeverity('MEDIUM')}</option>
            <option value="LOW">{tSeverity('LOW')}</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">
            {t('reportDefect')}
          </button>
          {message && (
            <p className="text-sm text-[var(--muted)] mt-2">{message}</p>
          )}
        </div>
      </form>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3">{tCommon('location')}</th>
                <th className="text-start px-4 py-3">{tCommon('description')}</th>
                <th className="text-start px-4 py-3">{tCommon('severity')}</th>
                <th className="text-start px-4 py-3">{tCommon('status')}</th>
                <th className="text-end px-4 py-3">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {defects.map((defect) => (
                <tr key={defect.id} className="border-t border-[var(--border)] text-[var(--text)]">
                  <td className="px-4 py-3">{defect.location}</td>
                  <td className="px-4 py-3">{defect.description}</td>
                  <td className={`px-4 py-3 ${severityClass(defect.severity)}`}>
                    {tSeverity.has(defect.severity)
                      ? tSeverity(defect.severity)
                      : defect.severity}
                  </td>
                  <td className="px-4 py-3">
                    {tStatus.has(defect.status)
                      ? tStatus(defect.status)
                      : defect.status}
                  </td>
                  <td className="px-4 py-3 text-end">
                    {defect.status === 'OPEN' && (
                      <button
                        type="button"
                        className="btn-success !px-3 !py-1 !text-xs"
                        onClick={() => markFixed(defect.id)}
                      >
                        {t('markFixed')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
