'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type ThemeChoice = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const t = useTranslations('common');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded border border-[var(--border)] opacity-50" />
    );
  }

  const activeTheme = (theme ?? 'system') as ThemeChoice;
  const isDark = resolvedTheme === 'dark';

  function cycleTheme() {
    const order: ThemeChoice[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(activeTheme) + 1) % order.length];
    setTheme(next);
  }

  const label =
    activeTheme === 'system'
      ? t('systemTheme')
      : isDark
        ? t('lightMode')
        : t('darkMode');

  const Icon =
    activeTheme === 'system' ? Monitor : isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
