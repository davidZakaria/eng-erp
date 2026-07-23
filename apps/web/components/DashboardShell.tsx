'use client';

import { AuthUser } from '@/lib/types';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DrawingReviewNotificationsProvider } from '@/components/drawings/DrawingReviewNotificationsProvider';
import { PendingDrawingsHeaderBadge } from '@/components/drawings/PendingDrawingsHeaderBadge';
import { RoleWelcomeGuide } from '@/components/help/RoleWelcomeGuide';
import { canReviewDrawings } from '@/lib/drawing-review';
import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';

export function DashboardShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations('common');
  const tRoles = useTranslations('roles');
  const showDrawingReviewAlerts = canReviewDrawings(user.role);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const shell = (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl">
              Eng-NJD
            </p>
            <p className="text-xs text-[var(--muted)]">
              {t('engineeringDashboard')} ·{' '}
              {tRoles.has(user.role) ? tRoles(user.role) : user.role}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {showDrawingReviewAlerts && <PendingDrawingsHeaderBadge />}
            <LanguageSwitcher />
            <ThemeToggle />
            <span className="text-sm text-[var(--muted)] hidden sm:inline">
              {user.fullName}
            </span>
            <button
              onClick={logout}
              className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              {t('signOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <RoleWelcomeGuide role={user.role} />
        {children}
      </main>
    </div>
  );

  if (showDrawingReviewAlerts) {
    return (
      <DrawingReviewNotificationsProvider>{shell}</DrawingReviewNotificationsProvider>
    );
  }

  return shell;
}
