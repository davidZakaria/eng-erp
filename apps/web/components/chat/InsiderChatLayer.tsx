'use client';

import { usePathname } from 'next/navigation';
import { ChatProvider } from '@/components/chat/ChatProvider';
import { FloatingChatWidget } from '@/components/chat/FloatingChatWidget';

export function InsiderChatLayer() {
  const pathname = usePathname();
  const isDashboard = pathname.includes('/dashboard');

  if (!isDashboard) {
    return null;
  }

  return (
    <ChatProvider>
      <FloatingChatWidget />
    </ChatProvider>
  );
}
