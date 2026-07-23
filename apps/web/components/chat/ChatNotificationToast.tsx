'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { ChatToastNotification } from '@/lib/types';

export function ChatNotificationToast({
  notifications,
  onDismiss,
  onOpen,
}: {
  notifications: ChatToastNotification[];
  onDismiss: (id: string) => void;
  onOpen: (conversationId: string) => void;
}) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 end-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function ToastItem({
  notification,
  onDismiss,
  onOpen,
}: {
  notification: ChatToastNotification;
  onDismiss: (id: string) => void;
  onOpen: (conversationId: string) => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss(notification.id);
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [notification.id, onDismiss]);

  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-[var(--accent)] p-2 text-white">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(notification.conversationId)}
            className="w-full text-start"
          >
            <p className="text-sm font-semibold text-[var(--text)]">
              {notification.title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
              {notification.body}
            </p>
          </button>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(notification.id)}
          className="text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
