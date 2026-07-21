'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { MaterialSubmittal } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

export function MepSubmittalsTab() {
  const [submittals, setSubmittals] = useState<MaterialSubmittal[]>([]);

  useEffect(() => {
    clientApi<MaterialSubmittal[]>('/mep/submittals')
      .then(setSubmittals)
      .catch(() => {});
  }, []);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#0f1419] text-[var(--muted)]">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Equipment Tag</th>
            <th className="text-left px-4 py-3 font-medium">Proposed Vendor</th>
            <th className="text-left px-4 py-3 font-medium">CSI Division</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-right px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {submittals.map((s) => {
            const locked = s.status === 'DEVIATION_PENDING_OWNER';
            return (
              <tr key={s.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-mono">{s.equipmentTag}</td>
                <td className="px-4 py-3">{s.proposedVendor}</td>
                <td className="px-4 py-3">
                  {s.csiDivision?.code} — {s.csiDivision?.title}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    {locked && (
                      <Lock className="h-4 w-4 text-[var(--danger)]" />
                    )}
                    {s.status.replace(/_/g, ' ')}
                  </span>
                  {locked && (
                    <p className="text-xs text-[var(--danger)] mt-1">
                      Requires Owner Override for Unlisted Vendor.
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    disabled={locked}
                    className="rounded bg-[var(--success)] px-3 py-1 text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Approve
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
