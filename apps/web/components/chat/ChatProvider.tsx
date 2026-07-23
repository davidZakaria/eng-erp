'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { AuthUser } from '@/lib/types';

type ChatContextValue = {
  socket: Socket | null;
  connected: boolean;
  user: AuthUser | null;
};

const ChatContext = createContext<ChatContextValue>({
  socket: null,
  connected: false,
  user: null,
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

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

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
    };
  }, []);

  const value = useMemo(
    () => ({ socket, connected, user }),
    [socket, connected, user],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
