'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Globe,
  MessageCircle,
  Send,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChat } from '@/components/chat/ChatProvider';
import { clientApi } from '@/lib/client-api';
import type {
  ChatConversation,
  ChatMessage,
  ChatModerationState,
  ChatUser,
} from '@/lib/types';

type PanelView = 'directory' | 'chat';

function conversationLabel(
  conversation: ChatConversation,
  currentUserId: string,
  globalChatLabel: string,
): string {
  if (conversation.isGlobal) {
    return globalChatLabel;
  }

  if (conversation.isGroup) {
    return conversation.name ?? 'Group chat';
  }

  return (
    conversation.peer?.fullName ??
    conversation.users.find((user) => user.id !== currentUserId)?.fullName ??
    'Direct message'
  );
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export function FloatingChatWidget() {
  const {
    socket,
    connected,
    user,
    moderation,
    unreadCount,
    setChatFocus,
    clearUnread,
    requestOpenWidget,
    consumeOpenWidgetRequest,
    pendingConversationId,
    setPendingConversationId,
  } = useChat();
  const t = useTranslations('chat');
  const tCommon = useTranslations('common');

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>('directory');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [banRemainingMs, setBanRemainingMs] = useState(0);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [globalConversation, setGlobalConversation] =
    useState<ChatConversation | null>(null);
  const [activeConversation, setActiveConversation] =
    useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setChatFocus({
      open,
      conversationId: activeConversation?.id ?? null,
    });
  }, [open, activeConversation, setChatFocus]);

  useEffect(() => {
    if (open) {
      clearUnread();
    }
  }, [open, clearUnread]);

  useEffect(() => {
    if (!requestOpenWidget) {
      return;
    }

    setOpen(true);
    consumeOpenWidgetRequest();
  }, [requestOpenWidget, consumeOpenWidgetRequest]);

  useEffect(() => {
    if (!moderation.bannedUntil) {
      setBanRemainingMs(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        new Date(moderation.bannedUntil!).getTime() - Date.now(),
      );
      setBanRemainingMs(remaining);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [moderation.bannedUntil]);

  const refreshDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const [nextUsers, nextConversations, status] = await Promise.all([
        clientApi<ChatUser[]>('/chat/users'),
        clientApi<ChatConversation[]>('/chat/conversations'),
        clientApi<{
          moderation: ChatModerationState;
          globalConversation: ChatConversation;
        }>('/chat/status'),
      ]);
      setUsers(nextUsers);
      setConversations(nextConversations);
      setGlobalConversation(status.globalConversation);
    } finally {
      setLoading(false);
    }
  }, []);

  const openConversation = useCallback(
    async (conversation: ChatConversation) => {
      setActiveConversation(conversation);
      setView('chat');
      setLoading(true);
      setNotice(null);

      try {
        const history = await clientApi<ChatMessage[]>(
          `/chat/conversations/${conversation.id}/messages`,
        );
        setMessages(history);
        socket?.emit('joinRoom', { conversationId: conversation.id });
      } finally {
        setLoading(false);
      }
    },
    [socket],
  );

  const startChat = useCallback(
    async (targetUserId: string) => {
      setLoading(true);
      try {
        const conversation = await clientApi<ChatConversation>(
          '/chat/conversations/direct',
          {
            method: 'POST',
            body: JSON.stringify({ targetUserId }),
          },
        );
        await refreshDirectory();
        await openConversation(conversation);
      } finally {
        setLoading(false);
      }
    },
    [openConversation, refreshDirectory],
  );

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    void refreshDirectory();
  }, [open, refreshDirectory, user]);

  useEffect(() => {
    if (!pendingConversationId || conversations.length === 0) {
      return;
    }

    const target =
      conversations.find((conversation) => conversation.id === pendingConversationId) ??
      globalConversation;

    if (target) {
      void openConversation(target);
      setPendingConversationId(null);
    }
  }, [
    pendingConversationId,
    conversations,
    globalConversation,
    openConversation,
    setPendingConversationId,
  ]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleNewMessage = (message: ChatMessage) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === message.conversationId
            ? {
                ...conversation,
                lastMessage: message,
                updatedAt: message.createdAt,
              }
            : conversation,
        ),
      );

      if (activeConversation?.id !== message.conversationId) {
        return;
      }

      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }
        return [...current, message];
      });
    };

    const handleModeration = (payload: ChatModerationState & { justBanned?: boolean }) => {
      if (payload.justBanned) {
        setNotice(t('chatBanned'));
      } else if (payload.warningCount > 0) {
        setNotice(
          t('languageWarning', {
            count: payload.warningCount,
            total: 3,
          }),
        );
      }
    };

    const handleError = (payload: { message?: string }) => {
      if (payload.message?.includes('muted')) {
        setNotice(t('chatBanned'));
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('chatModeration', handleModeration);
    socket.on('error', handleError);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('chatModeration', handleModeration);
      socket.off('error', handleError);
    };
  }, [socket, activeConversation, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (
      !socket ||
      !activeConversation ||
      !draft.trim() ||
      sending ||
      banRemainingMs > 0
    ) {
      return;
    }

    const content = draft.trim();
    setDraft('');
    setSending(true);
    setNotice(null);

    try {
      socket.emit('sendMessage', {
        conversationId: activeConversation.id,
        content,
      });
    } finally {
      setSending(false);
    }
  }

  const directConversations = useMemo(
    () =>
      [...conversations]
        .filter((conversation) => !conversation.isGlobal)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [conversations],
  );

  const isMuted = banRemainingMs > 0;
  const muteSeconds = Math.ceil(banRemainingMs / 1000);

  if (!user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 end-4 z-[60]">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="min-w-0">
              {view === 'chat' && activeConversation ? (
                <button
                  type="button"
                  onClick={() => {
                    setView('directory');
                    setActiveConversation(null);
                    setMessages([]);
                    setNotice(null);
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--text)] hover:text-[var(--accent)]"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {conversationLabel(activeConversation, user.id, t('globalChat'))}
                  </span>
                </button>
              ) : (
                <p className="text-sm font-medium text-[var(--text)]">
                  {t('messages')}
                </p>
              )}
            </div>
            <span
              className={`text-[10px] uppercase tracking-wide ${
                connected ? 'text-[var(--success)]' : 'text-[var(--muted)]'
              }`}
            >
              {connected ? t('live') : t('offline')}
            </span>
          </div>

          {view === 'directory' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {globalConversation && (
                <section className="border-b border-[var(--border)] p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    <Globe className="h-3.5 w-3.5" />
                    {t('globalChat')}
                  </div>
                  <button
                    type="button"
                    onClick={() => void openConversation(globalConversation)}
                    className="w-full rounded-md border border-[var(--accent)]/30 bg-[var(--surface-elevated)] px-3 py-3 text-start hover:border-[var(--accent)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--text)]">
                        {t('globalChat')}
                      </span>
                      {globalConversation.lastMessage && (
                        <span className="shrink-0 text-[10px] text-[var(--muted)]">
                          {formatTime(globalConversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {t('globalChatHint')}
                    </p>
                    {globalConversation.lastMessage && (
                      <p className="mt-2 truncate text-xs text-[var(--text)]">
                        {globalConversation.lastMessage.sender.fullName}:{' '}
                        {globalConversation.lastMessage.content}
                      </p>
                    )}
                  </button>
                </section>
              )}

              <section className="border-b border-[var(--border)] p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <Users className="h-3.5 w-3.5" />
                  {t('startChat')}
                </div>
                {loading && users.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">{tCommon('loading')}</p>
                ) : users.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">{t('noUsers')}</p>
                ) : (
                  <ul className="space-y-1">
                    {users.map((chatUser) => (
                      <li key={chatUser.id}>
                        <button
                          type="button"
                          onClick={() => void startChat(chatUser.id)}
                          className="w-full rounded-md px-2 py-2 text-start text-sm hover:bg-[var(--surface-elevated)]"
                        >
                          <span className="block font-medium text-[var(--text)]">
                            {chatUser.fullName}
                          </span>
                          <span className="block text-xs text-[var(--muted)]">
                            {chatUser.email}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="min-h-0 flex-1 overflow-y-auto p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t('conversations')}
                </p>
                {loading && directConversations.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">{tCommon('loading')}</p>
                ) : directConversations.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">{t('noConversations')}</p>
                ) : (
                  <ul className="space-y-1">
                    {directConversations.map((conversation) => (
                      <li key={conversation.id}>
                        <button
                          type="button"
                          onClick={() => void openConversation(conversation)}
                          className="w-full rounded-md px-2 py-2 text-start hover:bg-[var(--surface-elevated)]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-[var(--text)]">
                              {conversationLabel(
                                conversation,
                                user.id,
                                t('globalChat'),
                              )}
                            </span>
                            {conversation.lastMessage && (
                              <span className="shrink-0 text-[10px] text-[var(--muted)]">
                                {formatTime(conversation.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <p className="truncate text-xs text-[var(--muted)]">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : (
            <>
              {(notice || isMuted || moderation.warningCount > 0) && (
                <div className="border-b border-[var(--banner-danger-border)] bg-[var(--banner-danger-bg)] px-3 py-2 text-xs text-[var(--banner-danger-text)]">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                      {isMuted ? (
                        <p>{t('mutedUntil', { seconds: muteSeconds })}</p>
                      ) : (
                        notice ??
                        t('languageWarning', {
                          count: moderation.warningCount,
                          total: 3,
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
                {loading && messages.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">{tCommon('loading')}</p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">{t('emptyThread')}</p>
                ) : (
                  messages.map((message) => {
                    const mine = message.senderId === user.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            mine
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--surface-elevated)] text-[var(--text)]'
                          }`}
                        >
                          {!mine && (
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                              {message.sender.fullName}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <p
                            className={`mt-1 text-[10px] ${
                              mine ? 'text-white/80' : 'text-[var(--muted)]'
                            }`}
                          >
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-[var(--border)] p-3"
              >
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    isMuted ? t('mutedPlaceholder') : t('typeMessage')
                  }
                  disabled={isMuted}
                  className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={
                    !draft.trim() || sending || !connected || isMuted
                  }
                  className="btn-primary !px-3 !py-2"
                  aria-label={t('send')}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition hover:bg-[var(--accent-hover)]"
        aria-label={t('messages')}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
