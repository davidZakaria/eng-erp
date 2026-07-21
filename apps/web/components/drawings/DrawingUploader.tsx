'use client';

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { Discipline } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

const DISCIPLINES: Discipline[] = [
  'ARCHITECTURAL',
  'STRUCTURAL',
  'MEP',
  'INFRASTRUCTURE',
];

export function DrawingUploader({ onUploaded }: { onUploaded?: () => void }) {
  const [drawingNumber, setDrawingNumber] = useState('');
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('ARCHITECTURAL');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file || !drawingNumber.trim() || !title.trim()) {
      setStatus('Drawing number, title, and DWG file are required.');
      return;
    }

    setUploading(true);
    setStatus('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('drawingNumber', drawingNumber.trim());
      formData.append('title', title.trim());
      formData.append('discipline', discipline);

      await clientApi('/drawings', { method: 'POST', body: formData });

      setStatus('Drawing submitted for review.');
      setFile(null);
      setDrawingNumber('');
      setTitle('');
      onUploaded?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 p-6">
      <h2 className="text-lg font-medium mb-1">Upload Drawing</h2>
      <p className="text-xs text-[var(--muted)] mb-4">
        Upload AutoCAD DWG drawings (preferred). DXF and PDF also accepted.
      </p>

      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Drawing Number</span>
          <input
            value={drawingNumber}
            onChange={(e) => setDrawingNumber(e.target.value)}
            placeholder="e.g. A-101"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[#0f1419] px-3 py-2 text-sm uppercase"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ground Floor Plan"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[#0f1419] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Discipline</span>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[#0f1419] px-3 py-2 text-sm"
          >
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
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
        <Upload className="mx-auto mb-3 h-8 w-8 text-[var(--muted)]" />
        {file ? (
          <p className="text-sm">{file.name}</p>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Drag & drop a DWG file here, or{' '}
            <label className="text-[var(--accent)] cursor-pointer underline">
              browse
              <input
                type="file"
                className="hidden"
                accept=".dwg,.dxf,.pdf"
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
