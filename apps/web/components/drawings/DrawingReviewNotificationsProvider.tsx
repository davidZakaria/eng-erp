'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Drawing } from '@/lib/types';
import { DrawingUploadToast } from '@/components/drawings/DrawingUploadToast';
import { usePendingDrawingsPoll } from '@/hooks/use-pending-drawings-poll';

type PendingNavigationHandler = () => void;

type DrawingReviewNotificationsContextValue = {
  pendingCount: number;
  newUploads: Drawing[];
  listRefresh: number;
  dismissNewUploads: () => void;
  registerPendingNavigation: (handler: PendingNavigationHandler) => () => void;
};

const DrawingReviewNotificationsContext =
  createContext<DrawingReviewNotificationsContextValue | null>(null);

export function DrawingReviewNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { pendingCount, newUploads, dismissNewUploads } = usePendingDrawingsPoll({
    enabled: true,
  });
  const [listRefresh, setListRefresh] = useState(0);
  const navigateRef = useRef<PendingNavigationHandler | null>(null);

  useEffect(() => {
    if (newUploads.length > 0) {
      setListRefresh((n) => n + 1);
    }
  }, [newUploads]);

  const registerPendingNavigation = useCallback(
    (handler: PendingNavigationHandler) => {
      navigateRef.current = handler;
      return () => {
        if (navigateRef.current === handler) {
          navigateRef.current = null;
        }
      };
    },
    [],
  );

  const openPendingDrawings = useCallback(() => {
    navigateRef.current?.();
    dismissNewUploads();
  }, [dismissNewUploads]);

  const value = useMemo(
    () => ({
      pendingCount,
      newUploads,
      listRefresh,
      dismissNewUploads,
      registerPendingNavigation,
    }),
    [
      pendingCount,
      newUploads,
      listRefresh,
      dismissNewUploads,
      registerPendingNavigation,
    ],
  );

  return (
    <DrawingReviewNotificationsContext.Provider value={value}>
      <DrawingUploadToast
        uploads={newUploads}
        onDismiss={dismissNewUploads}
        onView={openPendingDrawings}
      />
      {children}
    </DrawingReviewNotificationsContext.Provider>
  );
}

export function useDrawingReviewNotifications() {
  const ctx = useContext(DrawingReviewNotificationsContext);
  if (!ctx) {
    throw new Error(
      'useDrawingReviewNotifications must be used within DrawingReviewNotificationsProvider',
    );
  }
  return ctx;
}

export function useOptionalDrawingReviewNotifications() {
  return useContext(DrawingReviewNotificationsContext);
}
