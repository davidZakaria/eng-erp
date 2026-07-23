'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { clientApi } from '@/lib/client-api';
import { SystemBackupRow } from '@/lib/types';

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function SystemBackupsTab() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [rows, setRows] = useState<SystemBackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await clientApi<SystemBackupRow[]>('/backups');
      setRows(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function trigger() {
    setRunning(true);
    setMessage(t('backupRunning'));
    try {
      await clientApi('/backups/trigger', { method: 'POST' });
      setMessage(t('backupDone'));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setRunning(false);
    }
  }

  async function download(id: string) {
    try {
      const data = await clientApi<{ downloadUrl: string; fileName: string }>(
        `/backups/${id}/download`,
      );
      window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Download failed');
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{tCommon('loading')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-[var(--text)]">
          {t('systemBackups')}
        </h3>
        <button
          type="button"
          className="btn-primary"
          disabled={running}
          onClick={trigger}
        >
          {t('triggerBackup')}
        </button>
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3">{t('timestamp')}</th>
                <th className="text-start px-4 py-3">{t('fileName')}</th>
                <th className="text-start px-4 py-3">{t('fileSize')}</th>
                <th className="text-start px-4 py-3">{t('backupStatus')}</th>
                <th className="text-end px-4 py-3">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                    {t('noBackups')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)] text-[var(--text)]">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.fileName}</td>
                    <td className="px-4 py-3">{formatBytes(row.fileSize)}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-1 !text-xs"
                        disabled={!row.fileUrl || row.status !== 'SUCCESS'}
                        onClick={() => download(row.id)}
                      >
                        {t('download')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
