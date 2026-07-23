'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Drawing } from '@/lib/types';

export function DrawingUploadToast({
  uploads,
  onDismiss,
  onView,
}: {
  uploads: Drawing[];
  onDismiss: () => void;
  onView: () => void;
}) {
  const t = useTranslations('drawings');

  useEffect(() => {
    if (uploads.length === 0) return;
    const timer = window.setTimeout(onDismiss, 12_000);
    return () => window.clearTimeout(timer);
  }, [uploads, onDismiss]);

  if (uploads.length === 0) return null;

  const latest = uploads[0];

  return (
    <div
      role="status"
      className="fixed bottom-4 end-4 z-[60] w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)] animate-pulse" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text)]">
            {uploads.length > 1
              ? t('multipleUploads', { count: uploads.length })
              : t('uploadNotificationTitle')}
          </p>
          <p className="mt-1 text-sm text-[var(--text)] truncate">
            {t('uploadNotificationBody', {
              number: latest.drawingNumber,
              title: latest.title,
            })}
          </p>
          {latest.uploader?.fullName && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {t('uploadNotificationBy', {
                consultant: latest.uploader.fullName,
              })}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary !px-3 !py-1.5 !text-xs" onClick={onView}>
              {t('viewPendingDrawings')}
            </button>
            <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={onDismiss}>
              {t('dismissNotification')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
