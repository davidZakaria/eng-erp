'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TransferProgress } from '@/components/TransferProgress';
import { Drawing } from '@/lib/types';
import {
  getDrawingFileUrl,
  isDwgFileUrl,
  isPdfFileUrl,
} from '@/lib/drawing-files';
import { downloadWithResume } from '@/lib/resilient-download';

function downloadFileName(drawing: Drawing): string {
  const ext = drawing.fileUrl.split('.').pop() ?? 'file';
  return `${drawing.drawingNumber}-${drawing.title}.${ext}`.replace(
    /[^a-zA-Z0-9._-]/g,
    '_',
  );
}

export function DrawingFileButton({ drawing }: { drawing: Drawing }) {
  const t = useTranslations('drawings');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'active' | 'retrying' | 'error'>('active');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  function actionLabel(): string {
    if (isPdfFileUrl(drawing.fileUrl)) return t('previewPdf');
    if (isDwgFileUrl(drawing.fileUrl)) return t('downloadDwg');
    return t('downloadCad');
  }

  async function openFile() {
    setLoading(true);
    setError('');
    setStatus('');
    setProgress(0);
    setPhase('active');

    try {
      const blob = await downloadWithResume(getDrawingFileUrl(drawing.id), {
        onProgress: (percent) => {
          setProgress(percent);
          setPhase('active');
          setStatus(t('downloadingFile'));
        },
        onRetry: () => {
          setPhase('retrying');
          setStatus(t('downloadInterrupted'));
        },
      });

      const objectUrl = URL.createObjectURL(blob);

      if (isPdfFileUrl(drawing.fileUrl)) {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      } else {
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = downloadFileName(drawing);
        anchor.click();
        URL.revokeObjectURL(objectUrl);
      }

      setStatus('');
    } catch (err) {
      setPhase('error');
      setError(
        err instanceof Error ? err.message : t('downloadFailedFinal'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-end min-w-[160px]">
      <button
        type="button"
        onClick={openFile}
        disabled={loading}
        className="text-[var(--accent)] hover:underline text-xs disabled:opacity-50"
      >
        {loading ? tCommon('loading') : actionLabel()}
      </button>
      {loading && (
        <TransferProgress
          percent={progress}
          phase={phase}
          activeLabel={status || t('downloadingFile')}
          retryLabel={t('downloadInterrupted')}
        />
      )}
      {error && (
        <p className="text-[10px] text-[var(--danger)] mt-1 max-w-[160px] ms-auto">
          {error}
        </p>
      )}
    </div>
  );
}
