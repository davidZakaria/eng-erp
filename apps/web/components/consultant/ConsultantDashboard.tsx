'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ModelSubmission } from '@/lib/types';
import { clientApi } from '@/lib/client-api';
import { FileUploader } from './FileUploader';

export function ConsultantDashboard() {
  const t = useTranslations('models');
  const tStatus = useTranslations('statuses');
  const [revisions, setRevisions] = useState<ModelSubmission[]>([]);
  const [selected, setSelected] = useState<ModelSubmission | null>(null);
  const [uploadDefaults, setUploadDefaults] = useState<{
    projectId: string;
    title: string;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadRevisions() {
    const data = await clientApi<ModelSubmission[]>(
      '/models/submissions/revisions-required',
    );
    setRevisions(data);
  }

  useEffect(() => {
    loadRevisions().catch(() => {});
  }, [refreshKey]);

  return (
    <div className="space-y-8">
      <FileUploader
        key={`${refreshKey}-${uploadDefaults?.title ?? 'new'}`}
        defaultProjectId={uploadDefaults?.projectId}
        defaultTitle={uploadDefaults?.title}
        onUploaded={() => {
          setRefreshKey((k) => k + 1);
          setSelected(null);
          setUploadDefaults(null);
        }}
      />

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-medium mb-4 text-[var(--text)]">
          {t('actionRequired')}
        </h2>

        {revisions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t('noRevisions')}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {revisions.map((model) => (
              <li
                key={model.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-[var(--text)]">{model.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {model.project?.name} · v{model.versionNumber} ·{' '}
                    {tStatus.has(model.status)
                      ? tStatus(model.status)
                      : model.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(model)}
                  className="text-sm text-[var(--accent)] hover:underline shrink-0"
                >
                  {t('viewFeedback')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="font-[family-name:var(--font-display)] text-2xl mb-2 text-[var(--text)]">
              {t('revisionRequired')}
            </h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              {selected.title} — {selected.project?.name}
            </p>

            <div className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] p-4 mb-6">
              <p className="text-xs text-[var(--muted)] mb-1">{t('heComments')}</p>
              <p className="text-sm whitespace-pre-wrap text-[var(--text)]">
                {selected.reviews?.[0]?.comments ?? t('noComments')}
              </p>
              {selected.reviews?.[0]?.reviewer && (
                <p className="text-xs text-[var(--muted)] mt-2">
                  — {selected.reviews[0].reviewer.fullName}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-secondary"
              >
                {t('close')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadDefaults({
                    projectId: selected.projectId,
                    title: selected.title,
                  });
                  setSelected(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn-primary"
              >
                {t('uploadV2')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
