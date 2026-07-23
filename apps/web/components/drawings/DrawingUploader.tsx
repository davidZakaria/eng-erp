'use client';

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Discipline } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

const DISCIPLINES: Discipline[] = [
  'ARCHITECTURAL',
  'STRUCTURAL',
  'MEP',
  'INFRASTRUCTURE',
];

interface PresignedUploadResponse {
  presignedUrl: string;
  fileKey: string;
  fileUrl: string;
}

function contentTypeForFile(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.dwg')) return 'application/acad';
  if (name.endsWith('.dxf')) return 'application/dxf';
  return file.type || 'application/octet-stream';
}

export function DrawingUploader({ onUploaded }: { onUploaded?: () => void }) {
  const t = useTranslations('drawings');
  const tDisc = useTranslations('disciplines');
  const tModels = useTranslations('models');
  const [drawingNumber, setDrawingNumber] = useState('');
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('ARCHITECTURAL');
  const [projectNumber, setProjectNumber] = useState('2315');
  const [disciplineCode, setDisciplineCode] = useState('');
  const [sheetNumber, setSheetNumber] = useState('');
  const [sheetSize, setSheetSize] = useState('');
  const [scale, setScale] = useState('');
  const [packageName, setPackageName] = useState('Construction Package G1');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file || !drawingNumber.trim() || !title.trim()) {
      setStatus(t('requiredFields'));
      return;
    }

    setUploading(true);
    setStatus(t('uploadingVault'));

    try {
      const contentType = contentTypeForFile(file);
      const query = new URLSearchParams({
        fileName: file.name,
        contentType,
      });

      const { presignedUrl, fileUrl } = await clientApi<PresignedUploadResponse>(
        `/storage/upload-url?${query.toString()}`,
      );

      const putResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });

      if (!putResponse.ok) {
        throw new Error(t('directUploadFailed'));
      }

      setStatus(t('registering'));

      await clientApi('/drawings', {
        method: 'POST',
        body: JSON.stringify({
          drawingNumber: drawingNumber.trim(),
          title: title.trim(),
          discipline,
          fileUrl,
          projectNumber: projectNumber.trim() || undefined,
          disciplineCode: disciplineCode.trim() || undefined,
          sheetNumber: sheetNumber.trim() || undefined,
          sheetSize: sheetSize.trim() || undefined,
          scale: scale.trim() || undefined,
          packageName: packageName.trim() || undefined,
        }),
      });

      setStatus(t('submitted'));
      setFile(null);
      setDrawingNumber('');
      setTitle('');
      setDisciplineCode('');
      setSheetNumber('');
      setSheetSize('');
      setScale('');
      onUploaded?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : tModels('uploadFailed'));
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
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-medium mb-1 text-[var(--text)]">{t('uploadDrawing')}</h2>
      <p className="text-xs text-[var(--muted)] mb-4">{t('uploadHint')}</p>

      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <label className="block">
          <span className="text-xs text-[var(--muted)]">{t('drawingNumber')}</span>
          <input
            value={drawingNumber}
            onChange={(e) => setDrawingNumber(e.target.value)}
            placeholder={t('placeholderNumber')}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm uppercase"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">{t('drawingTitle')}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('placeholderTitle')}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">{t('discipline')}</span>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
          >
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {tDisc(d)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs font-medium text-[var(--muted)] mb-2">{t('lodOptional')}</p>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-4">
        <label className="block">
          <span className="text-xs text-[var(--muted)]">{t('projectNumber')}</span>
          <input
            value={projectNumber}
            onChange={(e) => setProjectNumber(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">{t('sheetCode')}</span>
          <input
            value={disciplineCode}
            onChange={(e) => setDisciplineCode(e.target.value)}
            placeholder="AE"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm uppercase"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">{t('sheetNumber')}</span>
          <input
            value={sheetNumber}
            onChange={(e) => setSheetNumber(e.target.value)}
            placeholder="GR"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm uppercase"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">{t('sheetSize')}</span>
          <input
            value={sheetSize}
            onChange={(e) => setSheetSize(e.target.value)}
            placeholder="A1"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">{t('scale')}</span>
          <input
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            placeholder="1:100"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">{t('packageName')}</span>
          <input
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
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
        <Upload className="mx-auto mb-3 h-8 w-8 text-[var(--muted)]" />
        {file ? (
          <p className="text-sm text-[var(--text)]">
            {file.name}{' '}
            <span className="text-[var(--muted)]">
              ({(file.size / (1024 * 1024)).toFixed(1)} MB)
            </span>
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {t('dragDrop')}{' '}
            <label className="text-[var(--accent)] cursor-pointer underline">
              {t('browse')}
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
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="btn-primary"
        >
          {uploading ? t('uploading') : t('uploadSubmit')}
        </button>
        {status && (
          <span className="text-sm text-[var(--muted)]">{status}</span>
        )}
      </div>
    </section>
  );
}
