'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Role } from '@/lib/types';

export function RoleWelcomeGuide({ role }: { role: Role }) {
  const t = useTranslations('help');
  const [open, setOpen] = useState(false);

  const welcomeKey = `roleWelcome.${role}` as const;
  const abbrevKey = `roleAbbrev.${role}` as const;

  if (!t.has(welcomeKey)) {
    return null;
  }

  return (
    <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
          <BookOpen className="h-4 w-4 text-[var(--accent)]" />
          {t('welcomeTitle')}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--muted)] transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="space-y-4 border-t border-[var(--border)] px-4 py-4 text-sm leading-relaxed text-[var(--muted)]">
          <p className="text-[var(--text)]">{t(welcomeKey)}</p>
          {t.has(abbrevKey) && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t('abbrevTitle')}
              </p>
              <p className="whitespace-pre-line text-[var(--text)]">{t(abbrevKey)}</p>
            </div>
          )}
          <p className="text-xs">{t('generalTip')}</p>
        </div>
      )}
    </section>
  );
}
