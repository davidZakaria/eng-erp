'use client';

import { useCallback, useEffect, useState } from 'react';
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
      setStatus('Select project, title, and file.');
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

      setStatus('Model submitted for review.');
      setFile(null);
      onUploaded?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed');
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
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 p-6">
      <h2 className="text-lg font-medium mb-4">Submit CAD Model</h2>

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Project</span>
          <select
            value={projectId}
            onFocus={() => loadProjects()}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[#0f1419] px-3 py-2 text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-[var(--muted)]">Drawing Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Column A1 Structural"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[#0f1419] px-3 py-2 text-sm"
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
          <p className="text-sm">{file.name}</p>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Drag & drop CAD/PDF file here, or{' '}
            <label className="text-[var(--accent)] cursor-pointer underline">
              browse
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
          onClick={handleUpload}
          disabled={uploading}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Submit for Review'}
        </button>
        {status && (
          <span className="text-sm text-[var(--muted)]">{status}</span>
        )}
      </div>
    </section>
  );
}
