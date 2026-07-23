'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Project } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

interface FileUploaderProps {
  defaultProjectId?: string;
  defaultTitle?: string;
  onUploaded?: () => void;
}

export function FileUploader({
  defaultProjectId = '',
  defaultTitle = '',
  onUploaded,
}: FileUploaderProps) {
  const t = useTranslations('models');
  const tCommon = useTranslations('common');
  const tDrawings = useTranslations('drawings');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [title, setTitle] = useState(defaultTitle);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadProjects = useCallback(async () => {
    if (loaded) return;
    const data = await clientApi<Project[]>('/projects');
    setProjects(data);
    if (!projectId && data[0]) setProjectId(data[0].id);
    setLoaded(true);
  }, [loaded, projectId]);

  useEffect(() => {
    loadProjects().catch(() => {});
  }, [loadProjects]);

  async function handleUpload() {
    if (!file || !projectId || !title.trim()) {
      setStatus(t('selectAll'));
      return;
    }

    setUploading(true);
    setStatus('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('title', title.trim());

      await clientApi('/models/submissions', {
        method: 'POST',
        body: formData,
      });

      setStatus(t('modelSubmitted'));
      setFile(null);
      onUploaded?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-medium mb-4 text-[var(--text)]">{t('submitCad')}</h2>

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <label className="block">
          <span className="text-xs text-[var(--muted)]">{tCommon('project')}</span>
          <select
            value={projectId}
            onFocus={() => loadProjects()}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-[var(--muted)]">{tDrawings('drawingTitle')}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('placeholderTitle')}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded border-2 border-dashed p-10 text-center transition ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
            : 'border-[var(--border)]'
        }`}
      >
        {file ? (
          <p className="text-sm text-[var(--text)]">{file.name}</p>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {t('dragDrop')}{' '}
            <label className="text-[var(--accent)] cursor-pointer underline">
              {t('browse')}
              <input
                type="file"
                className="hidden"
                accept=".dwg,.dxf,.rvt,.pdf,.ifc"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="btn-primary"
        >
          {uploading ? tDrawings('uploading') : tDrawings('uploadSubmit')}
        </button>
        {status && (
          <span className="text-sm text-[var(--muted)]">{status}</span>
        )}
      </div>
    </section>
  );
}
