'use client';

import { AuthUser } from '@/lib/types';
import { useRouter } from 'next/navigation';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  CONSULTANT: 'Consultant',
  ARCH_CONSULTANT: 'Architectural Consultant',
  STRUCT_CONSULTANT: 'Structural Consultant',
  MEP_CONSULTANT: 'MEP Consultant',
  HEAD_ENGINEER: 'Head Engineer',
  PROJECT_MANAGER: 'Project Manager',
  SITE_ENGINEER: 'Site Engineer',
};

export function DashboardShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl">
              Eng-NJD
            </p>
            <p className="text-xs text-[var(--muted)]">
              Engineering Dashboard · {roleLabels[user.role] ?? user.role}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--muted)] hidden sm:inline">
              {user.fullName}
            </span>
            <button
              onClick={logout}
              className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
