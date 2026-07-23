'use client';

export function TransferProgress({
  percent,
  phase,
  retryLabel,
  activeLabel,
}: {
  percent: number;
  phase: 'active' | 'retrying' | 'error';
  retryLabel?: string;
  activeLabel?: string;
}) {
  const barClass =
    phase === 'retrying'
      ? 'bg-amber-500'
      : phase === 'error'
        ? 'bg-[var(--danger)]'
        : 'bg-[var(--accent)]';

  return (
    <div className="mb-4">
      <div className="h-2 rounded bg-[var(--surface-elevated)] overflow-hidden">
        <div
          className={`h-full transition-all ${barClass}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      <p className="text-xs text-[var(--muted)] mt-1">
        {phase === 'retrying' && retryLabel
          ? `${retryLabel} · ${percent}%`
          : activeLabel
            ? `${activeLabel} · ${percent}%`
            : `${percent}%`}
      </p>
    </div>
  );
}
