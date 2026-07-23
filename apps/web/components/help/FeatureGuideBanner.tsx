'use client';

import { Info } from 'lucide-react';

export function FeatureGuideBanner({ text }: { text: string }) {
  if (!text) {
    return null;
  }

  return (
    <div className="mb-4 flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/50 px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
      <p className="text-[var(--text)]">{text}</p>
    </div>
  );
}
