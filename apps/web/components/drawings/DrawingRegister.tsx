'use client';

import { useEffect, useState } from 'react';
import { Drawing } from '@/lib/types';
import { clientApi } from '@/lib/client-api';
import { fileExtensionFromUrl } from '@/lib/drawing-files';

function statusClass(status: string): string {
  if (status === 'REVISION_REQUESTED') {
    return 'bg-orange-950/40 text-orange-200';
  }
  if (status === 'PENDING_REVIEW') {
    return 'bg-amber-950/30';
  }
  return '';
}

export function DrawingRegister() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await clientApi<Drawing[]>('/drawings');
      setDrawings(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading drawing register…</p>;
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-lg font-medium">Drawing Register</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-[#0f1419] text-[var(--muted)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Number</th>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Discipline</th>
              <th className="text-left px-4 py-3 font-medium">Revision</th>
              <th className="text-left px-4 py-3 font-medium">Format</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {drawings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                  No drawings uploaded yet.
                </td>
              </tr>
            ) : (
              drawings.map((d) => (
                <tr
                  key={d.id}
                  className={`border-t border-[var(--border)] ${statusClass(d.status)}`}
                >
                  <td className="px-4 py-3 font-mono">{d.drawingNumber}</td>
                  <td className="px-4 py-3">{d.title}</td>
                  <td className="px-4 py-3">{d.discipline}</td>
                  <td className="px-4 py-3">Rev {d.revision}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[#0f1419] px-2 py-0.5 text-xs">
                      {fileExtensionFromUrl(d.fileUrl)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{d.status.replace(/_/g, ' ')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
