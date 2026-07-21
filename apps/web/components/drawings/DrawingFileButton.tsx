'use client';

import { useState } from 'react';
import { Drawing } from '@/lib/types';
import {
  drawingFileActionLabel,
  getDrawingFileUrl,
  isPdfFileUrl,
} from '@/lib/drawing-files';

function downloadFileName(drawing: Drawing): string {
  const ext = drawing.fileUrl.split('.').pop() ?? 'file';
  return `${drawing.drawingNumber}-${drawing.title}.${ext}`.replace(
    /[^a-zA-Z0-9._-]/g,
    '_',
  );
}

export function DrawingFileButton({ drawing }: { drawing: Drawing }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function openFile() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(getDrawingFileUrl(drawing.id));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(body.message)
            ? body.message.join(', ')
            : (body.message ?? `Failed to load file (${res.status})`),
        );
      }

      const blob = await res.blob();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={openFile}
        disabled={loading}
        className="text-[var(--accent)] hover:underline text-xs disabled:opacity-50"
      >
        {loading ? 'Loading…' : drawingFileActionLabel(drawing.fileUrl)}
      </button>
      {error && (
        <p className="text-[10px] text-[var(--danger)] mt-1 max-w-[140px] ml-auto">
          {error}
        </p>
      )}
    </div>
  );
}
