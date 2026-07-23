'use client';

import { CircleHelp } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function HelpTooltip({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const t = useTranslations('help');

  return (
    <span
      className={`group relative inline-flex align-middle ${className}`}
      tabIndex={0}
    >
      <button
        type="button"
        className="rounded-full p-0.5 text-[var(--muted)] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-label={t('tooltipLabel')}
        title={text}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full start-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-start text-[11px] leading-snug text-[var(--text)] shadow-lg group-hover:block group-focus-within:block sm:w-64"
      >
        {text}
      </span>
    </span>
  );
}
