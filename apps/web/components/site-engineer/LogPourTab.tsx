'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Project } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

interface ExecutionLogRow {
  id: string;
  actualConcreteM3: number;
  actualPourDate: string;
  notes: string | null;
  buildingComponent?: {
    id: string;
    name: string;
    building?: { name: string; project?: { name: string } };
  };
  siteEngineer?: { fullName: string };
}

export function LogPourTab() {
  const t = useTranslations('site');
  const tCommon = useTranslations('common');
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<ExecutionLogRow[]>([]);
  const [componentId, setComponentId] = useState('');
  const [concrete, setConcrete] = useState('5');
  const [pourDate, setPourDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const components = useMemo(
    () =>
      projects.flatMap((p) =>
        p.buildings.flatMap((b) =>
          b.components.map((c) => ({
            id: c.id,
            label: `${p.name} · ${b.name} · ${c.name}`,
          })),
        ),
      ),
    [projects],
  );

  async function load() {
    const [projectData, logData] = await Promise.all([
      clientApi<Project[]>('/projects'),
      clientApi<ExecutionLogRow[]>('/execution-logs'),
    ]);
    setProjects(projectData);
    setLogs(logData);
    if (!componentId && projectData[0]?.buildings[0]?.components[0]) {
      setComponentId(projectData[0].buildings[0].components[0].id);
    }
  }

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!componentId) return;
    setLoading(true);
    setMessage('');
    try {
      await clientApi('/execution-logs', {
        method: 'POST',
        body: JSON.stringify({
          buildingComponentId: componentId,
          actualConcreteM3: Number(concrete),
          actualRebarByDiameter: { '16': 100 },
          actualPourDate: new Date(pourDate).toISOString(),
          notes: notes.trim() || undefined,
        }),
      });
      setNotes('');
      setMessage(t('pourLogged'));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('pourFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 grid gap-3 sm:grid-cols-2"
      >
        <h3 className="sm:col-span-2 text-sm font-medium text-[var(--text)]">
          {t('logPour')}
        </h3>
        <label className="block text-sm sm:col-span-2">
          <span className="text-[var(--muted)]">{tCommon('component')}</span>
          <select
            required
            value={componentId}
            onChange={(e) => setComponentId(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
          >
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">{t('concreteM3')}</span>
          <input
            required
            type="number"
            min={0}
            step={0.1}
            value={concrete}
            onChange={(e) => setConcrete(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">{t('pourDate')}</span>
          <input
            required
            type="date"
            value={pourDate}
            onChange={(e) => setPourDate(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-[var(--muted)]">{tCommon('comments')}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2"
          />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? tCommon('loading') : t('submitPour')}
          </button>
          {message && (
            <p className="text-sm text-[var(--muted)] mt-2">{message}</p>
          )}
        </div>
      </form>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <h3 className="px-4 py-3 border-b border-[var(--border)] text-sm font-medium text-[var(--text)]">
          {t('recentPours')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3">{tCommon('component')}</th>
                <th className="text-end px-4 py-3">{t('concreteM3')}</th>
                <th className="text-start px-4 py-3">{t('pourDate')}</th>
                <th className="text-start px-4 py-3">{tCommon('comments')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                    {t('noPours')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-[var(--border)] text-[var(--text)]">
                    <td className="px-4 py-3">
                      {log.buildingComponent?.building?.project?.name} ·{' '}
                      {log.buildingComponent?.building?.name} ·{' '}
                      {log.buildingComponent?.name}
                    </td>
                    <td className="px-4 py-3 text-end">{log.actualConcreteM3}</td>
                    <td className="px-4 py-3">
                      {new Date(log.actualPourDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {log.notes ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
