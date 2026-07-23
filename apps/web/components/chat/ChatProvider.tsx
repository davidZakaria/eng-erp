'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useTranslations } from 'next-intl';
import { ChatNotificationToast } from '@/components/chat/ChatNotificationToast';
import {
  AuthUser,
  ChatMessageNotification,
  ChatModerationState,
  ChatToastNotification,
} from '@/lib/types';

type ChatFocus = {
  open: boolean;
  conversationId: string | null;
};

type ChatContextValue = {
  socket: Socket | null;
  connected: boolean;
  user: AuthUser | null;
  moderation: ChatModerationState;
  unreadCount: number;
  notifications: ChatToastNotification[];
  focus: ChatFocus;
  setChatFocus: (focus: ChatFocus) => void;
  openConversationFromNotification: (conversationId: string) => void;
  clearUnread: () => void;
  dismissNotification: (id: string) => void;
  requestOpenWidget: boolean;
  consumeOpenWidgetRequest: () => void;
  pendingConversationId: string | null;
  setPendingConversationId: (conversationId: string | null) => void;
};

const defaultModeration: ChatModerationState = {
  warningCount: 0,
  bannedUntil: null,
  isBanned: false,
};

const ChatContext = createContext<ChatContextValue>({
  socket: null,
  connected: false,
  user: null,
  moderation: defaultModeration,
  unreadCount: 0,
  notifications: [],
  focus: { open: false, conversationId: null },
  setChatFocus: () => undefined,
  openConversationFromNotification: () => undefined,
  clearUnread: () => undefined,
  dismissNotification: () => undefined,
  requestOpenWidget: false,
  consumeOpenWidgetRequest: () => undefined,
  pendingConversationId: null,
  setPendingConversationId: () => undefined,
});

export function useChat() {
  return useContext(ChatContext);
}

function resolveWsUrl() {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3001';
}

function createNotificationId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('chat');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [moderation, setModeration] =
    useState<ChatModerationState>(defaultModeration);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<ChatToastNotification[]>(
    [],
  );
  const [focus, setFocus] = useState<ChatFocus>({
    open: false,
    conversationId: null,
  });
  const [requestOpenWidget, setRequestOpenWidget] = useState(false);
  const [pendingConversationId, setPendingConversationId] = useState<
    string | null
  >(null);
  const focusRef = useRef(focus);
  const notificationsEnabledRef = useRef(false);

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  }, []);

  const pushNotification = useCallback(
    (payload: ChatMessageNotification) => {
      const toast: ChatToastNotification = {
        id: createNotificationId(),
        title: t('newMessageFrom', { name: payload.senderName }),
        body: `${payload.conversationName}: ${payload.preview}`,
        conversationId: payload.conversationId,
      };

      setNotifications((current) => [toast, ...current].slice(0, 4));

      if (
        typeof window !== 'undefined' &&
        notificationsEnabledRef.current &&
        document.hidden &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(toast.title, { body: toast.body });
      }
    },
    [t],
  );

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const openConversationFromNotification = useCallback(
    (conversationId: string) => {
      setPendingConversationId(conversationId);
      setRequestOpenWidget(true);
      setUnreadCount(0);
    },
    [],
  );

  const consumeOpenWidgetRequest = useCallback(() => {
    setRequestOpenWidget(false);
  }, []);

  useEffect(() => {
    let active = true;
    let client: Socket | null = null;

    async function connect() {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok || !active) {
          return;
        }

        const session = (await res.json()) as {
          token: string;
          user: AuthUser;
        };

        if (!active) {
          return;
        }

        setUser(session.user);

        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'default'
        ) {
          const permission = await Notification.requestPermission();
          notificationsEnabledRef.current = permission === 'granted';
        } else if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          notificationsEnabledRef.current = true;
        }

        const statusRes = await fetch('/api/proxy?path=%2Fchat%2Fstatus');
        if (statusRes.ok) {
          const status = (await statusRes.json()) as {
            moderation: ChatModerationState;
          };
          if (active) {
            setModeration(status.moderation);
          }
        }

        client = io(resolveWsUrl(), {
          auth: { token: session.token },
          transports: ['websocket', 'polling'],
        });

        client.on('connect', () => {
          if (active) {
            setConnected(true);
          }
        });

        client.on('disconnect', () => {
          if (active) {
            setConnected(false);
          }
        });

        client.on('chatStatus', (payload: { moderation: ChatModerationState }) => {
          if (active) {
            setModeration(payload.moderation);
          }
        });

        client.on('chatModeration', (payload: ChatModerationState) => {
          if (active) {
            setModeration(payload);
          }
        });

        client.on('chatBanned', (payload: { bannedUntil: string | null }) => {
          if (active) {
            setModeration((current) => ({
              ...current,
              bannedUntil: payload.bannedUntil,
              isBanned: Boolean(payload.bannedUntil),
              warningCount: 0,
            }));
          }
        });

        client.on('messageNotification', (payload: ChatMessageNotification) => {
          if (!active || payload.message.senderId === session.user.id) {
            return;
          }

          const currentFocus = focusRef.current;
          const isActiveThread =
            currentFocus.open &&
            currentFocus.conversationId === payload.conversationId;

          if (!isActiveThread) {
            setUnreadCount((count) => count + 1);
            pushNotification(payload);
          }
        });

        setSocket(client);
      } catch {
        // Chat is optional — ignore connection failures on public pages
      }
    }

    void connect();

    return () => {
      active = false;
      client?.disconnect();
      setSocket(null);
      setConnected(false);
      setUser(null);
      setModeration(defaultModeration);
    };
  }, [pushNotification]);

  const value = useMemo(
    () => ({
      socket,
      connected,
      user,
      moderation,
      unreadCount,
      notifications,
      focus,
      setChatFocus: setFocus,
      openConversationFromNotification,
      clearUnread,
      dismissNotification,
      requestOpenWidget,
      consumeOpenWidgetRequest,
      pendingConversationId,
      setPendingConversationId,
    }),
    [
      socket,
      connected,
      user,
      moderation,
      unreadCount,
      notifications,
      focus,
      openConversationFromNotification,
      clearUnread,
      dismissNotification,
      requestOpenWidget,
      consumeOpenWidgetRequest,
      pendingConversationId,
    ],
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
      <ChatNotificationToast
        notifications={notifications}
        onDismiss={dismissNotification}
        onOpen={openConversationFromNotification}
      />
    </ChatContext.Provider>
  );
}
