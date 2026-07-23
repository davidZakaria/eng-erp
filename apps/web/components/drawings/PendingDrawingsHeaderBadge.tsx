'use client';

import { useTranslations } from 'next-intl';
import { useOptionalDrawingReviewNotifications } from '@/components/drawings/DrawingReviewNotificationsProvider';

export function PendingDrawingsHeaderBadge({ label }: { label: string }) {
  const tDrawings = useTranslations('drawings');
  const ctx = useOptionalDrawingReviewNotifications();
  const pendingCount = ctx?.pendingCount ?? 0;

  if (pendingCount <= 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--accent)]"
      title={tDrawings('pendingReviewBadge', { count: pendingCount })}
    >
      <span className="inline-flex h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
      {tDrawings('pendingReviewBadge', { count: pendingCount })}
    </span>
  );
}
