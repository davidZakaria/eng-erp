'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import Uppy from '@uppy/core';
import AwsS3 from '@uppy/aws-s3';
import { useTranslations } from 'next-intl';

import { DrawingRegister } from '@/components/drawings/DrawingRegister';
import { clientApi } from '@/lib/client-api';
import {
  contentTypeForFileName,
  DRAWING_DISCIPLINES,
  MultipartCreateResponse,
  MultipartPartResponse,
  SignPartResponse,
} from '@/lib/drawing-upload';
import { Discipline } from '@/lib/types';

export default function ConsultantDashboardPage() {
  const t = useTranslations('drawings');
  const tDisc = useTranslations('disciplines');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawingNumber, setDrawingNumber] = useState('');
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('ARCHITECTURAL');
  const [projectNumber, setProjectNumber] = useState('2315');
  const [disciplineCode, setDisciplineCode] = useState('');
  const [sheetNumber, setSheetNumber] = useState('');
  const [sheetSize, setSheetSize] = useState('');
  const [scale, setScale] = useState('');
  const [packageName, setPackageName] = useState('Construction Package G1');
  const [status, setStatus] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uppy = useMemo(() => {
    const instance = new Uppy({
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: ['.dwg', '.dxf', '.pdf'],
      },
    });

    instance.use(AwsS3, {
      shouldUseMultipart: true,
      retryDelays: [0, 1000, 3000, 5000],
      createMultipartUpload: async (file) => {
        const contentType = contentTypeForFileName(file.name ?? '', file.type);
        const data = await clientApi<MultipartCreateResponse>(
          '/storage/multipart/create',
          {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name ?? 'drawing.dwg',
              contentType,
            }),
          },
        );

        instance.setFileMeta(file.id, {
          fileUrl: data.fileUrl,
          fileKey: data.fileKey,
        });

        return { uploadId: data.uploadId, key: data.key };
      },
      listParts: async (_file, { uploadId, key }) => {
        const query = new URLSearchParams({
          key,
          uploadId: uploadId ?? '',
        });
        return clientApi<MultipartPartResponse[]>(
          `/storage/multipart/list-parts?${query.toString()}`,
        );
      },
      signPart: async (_file, { uploadId, key, partNumber }) => {
        const query = new URLSearchParams({
          key,
          uploadId,
          partNumber: String(partNumber),
        });

        const data = await clientApi<SignPartResponse>(
          `/storage/multipart/sign-part?${query.toString()}`,
        );

        return { method: 'PUT', url: data.url };
      },
      completeMultipartUpload: async (file, { uploadId, key, parts }) => {
        const data = await clientApi<{ fileUrl: string; fileKey: string }>(
          '/storage/multipart/complete',
          {
            method: 'POST',
            body: JSON.stringify({ key, uploadId, parts }),
          },
        );

        instance.setFileMeta(file.id, {
          fileUrl: data.fileUrl,
          fileKey: data.fileKey,
        });

        return { location: data.fileUrl };
      },
      abortMultipartUpload: async (_file, { uploadId, key }) => {
        await clientApi('/storage/multipart/abort', {
          method: 'POST',
          body: JSON.stringify({ key, uploadId }),
        });
      },
    });

    return instance;
  }, []);

  useEffect(() => {
    const onProgress = (
      _file: unknown,
      progressData: { bytesUploaded: number; bytesTotal: number | null },
    ) => {
      if (!progressData.bytesTotal) return;
      setProgress(
        Math.round((progressData.bytesUploaded / progressData.bytesTotal) * 100),
      );
    };

    const onUploadError = (_file: unknown, error: Error) => {
      setUploading(false);
      setStatus(error?.message || t('uploadInterrupted'));
    };

    const onComplete = async (result: {
      successful?: { meta: Record<string, unknown> }[];
      failed?: unknown[];
    }) => {
      setUploading(false);

      if (result.failed?.length) {
        setStatus(t('uploadInterrupted'));
        return;
      }

      try {
        setStatus(t('registering'));

        for (const file of result.successful ?? []) {
          const fileUrl = file.meta.fileUrl as string | undefined;
          const drawingNumberValue = file.meta.drawingNumber as string | undefined;
          const titleValue = file.meta.title as string | undefined;
          const disciplineValue = file.meta.discipline as Discipline | undefined;

          if (!fileUrl || !drawingNumberValue || !titleValue || !disciplineValue) {
            throw new Error('Missing upload or drawing metadata');
          }

          await clientApi('/drawings', {
            method: 'POST',
            body: JSON.stringify({
              drawingNumber: drawingNumberValue,
              title: titleValue,
              discipline: disciplineValue,
              fileUrl,
              projectNumber: (file.meta.projectNumber as string | undefined)?.trim() || undefined,
              disciplineCode: (file.meta.disciplineCode as string | undefined)?.trim() || undefined,
              sheetNumber: (file.meta.sheetNumber as string | undefined)?.trim() || undefined,
              sheetSize: (file.meta.sheetSize as string | undefined)?.trim() || undefined,
              scale: (file.meta.scale as string | undefined)?.trim() || undefined,
              packageName: (file.meta.packageName as string | undefined)?.trim() || undefined,
            }),
          });
        }

        setStatus(t('submitted'));
        setDrawingNumber('');
        setTitle('');
        setDisciplineCode('');
        setSheetNumber('');
        setSheetSize('');
        setScale('');
        setFileName('');
        setProgress(0);
        uppy.clear();
        if (fileInputRef.current) fileInputRef.current.value = '';
        setRefreshKey((k) => k + 1);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : t('registrationFailed'));
      }
    };

    uppy.on('upload-progress', onProgress);
    uppy.on('upload-error', onUploadError);
    uppy.on('complete', onComplete);

    return () => {
      uppy.off('upload-progress', onProgress);
      uppy.off('upload-error', onUploadError);
      uppy.off('complete', onComplete);
      uppy.destroy();
    };
  }, [uppy, t]);

  function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    uppy.clear();
    try {
      uppy.addFile({
        name: file.name,
        type: file.type || contentTypeForFileName(file.name),
        data: file,
        source: 'Local',
        isRemote: false,
      });
      setFileName(file.name);
      setStatus('');
      setProgress(0);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t('couldNotAddFile'));
      setFileName('');
    }
  }

  function startUpload() {
    if (!drawingNumber.trim() || !title.trim()) {
      setStatus(t('enterNumberTitle'));
      return;
    }

    if (uppy.getFiles().length === 0) {
      setStatus(t('chooseFileFirst'));
      return;
    }

    setUploading(true);
    setStatus(t('uploadingVault'));
    uppy.getFiles().forEach((file) => {
      uppy.setFileMeta(file.id, {
        ...file.meta,
        drawingNumber: drawingNumber.trim(),
        title: title.trim(),
        discipline,
        projectNumber: projectNumber.trim(),
        disciplineCode: disciplineCode.trim(),
        sheetNumber: sheetNumber.trim(),
        sheetSize: sheetSize.trim(),
        scale: scale.trim(),
        packageName: packageName.trim(),
      });
    });
    uppy.upload();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-medium text-[var(--text)]">{t('uploadDrawing')}</h2>
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
              {DRAWING_DISCIPLINES.map((d) => (
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".dwg,.dxf,.pdf,application/pdf"
          className="hidden"
          onChange={onFileChosen}
        />

        <button
          type="button"
          className="btn-browse mb-3"
          onClick={() => fileInputRef.current?.click()}
        >
          {fileName
            ? t('selectedFile', { name: fileName })
            : t('chooseFile')}
        </button>

        {uploading && (
          <div className="mb-4">
            <div className="h-2 rounded bg-[var(--surface-elevated)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">{progress}%</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={startUpload}
            disabled={!fileName || uploading}
            className="btn-primary"
          >
            {uploading ? t('uploading') : t('uploadSubmit')}
          </button>
          <span className="text-sm text-[var(--muted)]">
            {fileName ? t('fileReady') : t('noFileSelected')}
          </span>
          {status && (
            <span className="text-sm text-[var(--text)]">{status}</span>
          )}
        </div>
      </section>

      <DrawingRegister key={refreshKey} />
    </div>
  );
}
