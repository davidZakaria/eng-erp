'use client';

import { useEffect, useState } from 'react';
import { VarianceReportRow } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ProjectManagerDashboard() {
  const [variance, setVariance] = useState<VarianceReportRow[]>([]);

  useEffect(() => {
    clientApi<VarianceReportRow[]>('/reports/variance')
      .then(setVariance)
      .catch(() => {});
  }, []);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 overflow-x-auto">
      <h2 className="text-lg font-medium px-4 py-3 border-b border-[var(--border)]">
        Site Progress — Variance Report
      </h2>
      <table className="w-full text-sm min-w-[720px]">
        <thead className="bg-[#0f1419] text-[var(--muted)]">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Component</th>
            <th className="text-right px-4 py-3 font-medium">Planned Concrete (m³)</th>
            <th className="text-right px-4 py-3 font-medium">Actual Concrete (m³)</th>
            <th className="text-left px-4 py-3 font-medium">Planned End</th>
            <th className="text-left px-4 py-3 font-medium">Actual End</th>
          </tr>
        </thead>
        <tbody>
          {variance.map((row) => {
            const flagged = row.isOverBudget || row.isDelayed;
            return (
              <tr
                key={row.componentId}
                className={`border-t border-[var(--border)] ${flagged ? 'text-[var(--danger)]' : ''}`}
              >
                <td className="px-4 py-3">{row.componentName}</td>
                <td className="px-4 py-3 text-right">{row.plannedConcreteM3}</td>
                <td className="px-4 py-3 text-right">{row.actualConcreteM3}</td>
                <td className="px-4 py-3">{formatDate(row.plannedEndDate)}</td>
                <td className="px-4 py-3">{formatDate(row.actualEndDate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
