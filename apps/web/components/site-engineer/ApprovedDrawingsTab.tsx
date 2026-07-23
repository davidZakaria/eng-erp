'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Drawing } from '@/lib/types';
import { clientApi } from '@/lib/client-api';
import { fileExtensionFromUrl } from '@/lib/drawing-files';
import { DrawingFileButton } from '@/components/drawings/DrawingFileButton';

export function ApprovedDrawingsTab() {
  const t = useTranslations('site');
  const tCommon = useTranslations('common');
  const tDrawings = useTranslations('drawings');
  const tDisc = useTranslations('disciplines');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientApi<Drawing[]>('/drawings')
      .then(setDrawings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{tCommon('loading')}</p>;
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <p className="px-4 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)]">
        {t('approvedHint')}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
            <tr>
              <th className="text-start px-4 py-3 font-medium">{tCommon('number')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('title')}</th>
              <th className="text-start px-4 py-3 font-medium">{tDrawings('discipline')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('revision')}</th>
              <th className="text-start px-4 py-3 font-medium">{tCommon('format')}</th>
              <th className="text-end px-4 py-3 font-medium">{tCommon('file')}</th>
            </tr>
          </thead>
          <tbody>
            {drawings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                  {t('noApprovedDrawings')}
                </td>
              </tr>
            ) : (
              drawings.map((d) => (
                <tr key={d.id} className="border-t border-[var(--border)] text-[var(--text)]">
                  <td className="px-4 py-3 font-mono">{d.drawingNumber}</td>
                  <td className="px-4 py-3">{d.title}</td>
                  <td className="px-4 py-3">{tDisc(d.discipline)}</td>
                  <td className="px-4 py-3">{d.revision}</td>
                  <td className="px-4 py-3">{fileExtensionFromUrl(d.fileUrl)}</td>
                  <td className="px-4 py-3 text-end">
                    <DrawingFileButton drawing={d} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
