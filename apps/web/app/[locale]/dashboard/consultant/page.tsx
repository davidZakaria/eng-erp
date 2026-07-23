'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { DrawingRegister } from '@/components/drawings/DrawingRegister';
import { FeatureGuideBanner } from '@/components/help/FeatureGuideBanner';
import { DashboardTabNav } from '@/components/help/DashboardTabNav';
import { MepConsultantPanel } from '@/components/mep/MepSubmittalForm';
import { TransferProgress } from '@/components/TransferProgress';
import { clientApi } from '@/lib/client-api';
import {
  DRAWING_DISCIPLINES,
} from '@/lib/drawing-upload';
import { uploadDrawingFileMultipart } from '@/lib/resilient-multipart-upload';
import { Discipline, Role } from '@/lib/types';

const ALLOWED_EXTENSIONS = ['.dwg', '.dxf', '.pdf'];

function isAllowedDrawingFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export default function ConsultantDashboardPage() {
  const t = useTranslations('drawings');
  const tNav = useTranslations('nav');
  const tHelp = useTranslations('help');
  const tDisc = useTranslations('disciplines');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [tab, setTab] = useState<'drawings' | 'mep'>('drawings');
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawingNumber, setDrawingNumber] = useState('');
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('ARCHITECTURAL');
  const [projectNumber, setProjectNumber] = useState('2315');
  const [disciplineCode, setDisciplineCode] = useState('');
  const [sheetNumber, setSheetNumber] = useState('');
  const [sheetSize, setSheetSize] = useState('');
  const [scale, setScale] = useState('');
  const [packageName, setPackageName] = useState('Construction Package G1');
  const [status, setStatus] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<
    'idle' | 'active' | 'retrying' | 'error'
  >('idle');

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((session: { user?: { role: Role } } | null) => {
        if (!session?.user?.role) return;
        setRole(session.user.role);
        if (session.user.role === 'MEP_CONSULTANT') {
          setTab('mep');
        }
      })
      .catch(() => undefined);
  }, []);

  function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAllowedDrawingFile(file)) {
      setStatus(t('couldNotAddFile'));
      setFileName('');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setStatus('');
    setProgress(0);
    setUploadPhase('idle');
  }

  async function startUpload() {
    if (!drawingNumber.trim() || !title.trim()) {
      setStatus(t('enterNumberTitle'));
      return;
    }

    if (!selectedFile) {
      setStatus(t('chooseFileFirst'));
      return;
    }

    setUploading(true);
    setUploadPhase('active');
    setProgress(0);
    setStatus(t('uploadingVault'));

    try {
      const { fileUrl } = await uploadDrawingFileMultipart(selectedFile, {
        onProgress: (uploaded, total) => {
          setUploadPhase((phase) => (phase === 'retrying' ? 'active' : phase));
          setProgress(Math.round((uploaded / total) * 100));
          setStatus((current) =>
            current === t('uploadInterrupted') ? current : t('uploadingVault'),
          );
        },
        onRetry: () => {
          setUploadPhase('retrying');
          setStatus(t('uploadInterrupted'));
        },
      });

      setUploadPhase('active');
      setStatus(t('registering'));

      await clientApi('/drawings', {
        method: 'POST',
        body: JSON.stringify({
          drawingNumber: drawingNumber.trim(),
          title: title.trim(),
          discipline,
          fileUrl,
          projectNumber: projectNumber.trim() || undefined,
          disciplineCode: disciplineCode.trim() || undefined,
          sheetNumber: sheetNumber.trim() || undefined,
          sheetSize: sheetSize.trim() || undefined,
          scale: scale.trim() || undefined,
          packageName: packageName.trim() || undefined,
        }),
      });

      setStatus(t('submitted'));
      setUploadPhase('idle');
      setDrawingNumber('');
      setTitle('');
      setDisciplineCode('');
      setSheetNumber('');
      setSheetSize('');
      setScale('');
      setFileName('');
      setSelectedFile(null);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setUploadPhase('error');
      setStatus(
        err instanceof Error ? err.message : t('uploadFailedFinal'),
      );
    } finally {
      setUploading(false);
    }
  }

  const isMepConsultant = role === 'MEP_CONSULTANT';
  const consultantTabs = [
    { id: 'mep', label: tNav('mepSubmittals') },
    { id: 'drawings', label: t('uploadDrawing') },
  ] as const;

  return (
    <div className="space-y-8">
      {isMepConsultant ? (
        <DashboardTabNav
          tabs={[...consultantTabs]}
          activeTab={tab}
          onTabChange={setTab}
          helpScope="consultant"
        />
      ) : (
        <FeatureGuideBanner
          text={
            tHelp.has('tabs.consultant.drawings.guide')
              ? tHelp('tabs.consultant.drawings.guide')
              : ''
          }
        />
      )}

      {isMepConsultant && tab === 'mep' ? (
        <MepConsultantPanel />
      ) : (
        <>
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-medium text-[var(--text)]">{t('uploadDrawing')}</h2>
        <p className="text-xs text-[var(--muted)] mb-4">{t('uploadHint')}</p>

        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('drawingNumber')}</span>
            <input
              value={drawingNumber}
              onChange={(e) => setDrawingNumber(e.target.value)}
              placeholder={t('placeholderNumber')}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm uppercase"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('drawingTitle')}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('placeholderTitle')}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('discipline')}</span>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value as Discipline)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
            >
              {DRAWING_DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {tDisc(d)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-xs font-medium text-[var(--muted)] mb-2">{t('lodOptional')}</p>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-4">
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('projectNumber')}</span>
            <input
              value={projectNumber}
              onChange={(e) => setProjectNumber(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('sheetCode')}</span>
            <input
              value={disciplineCode}
              onChange={(e) => setDisciplineCode(e.target.value)}
              placeholder="AE"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm uppercase"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('sheetNumber')}</span>
            <input
              value={sheetNumber}
              onChange={(e) => setSheetNumber(e.target.value)}
              placeholder="GR"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm uppercase"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('sheetSize')}</span>
            <input
              value={sheetSize}
              onChange={(e) => setSheetSize(e.target.value)}
              placeholder="A1"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('scale')}</span>
            <input
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              placeholder="1:100"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('packageName')}</span>
            <input
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".dwg,.dxf,.pdf,application/pdf"
          className="hidden"
          onChange={onFileChosen}
        />

        <button
          type="button"
          className="btn-browse mb-3"
          onClick={() => fileInputRef.current?.click()}
        >
          {fileName
            ? t('selectedFile', { name: fileName })
            : t('chooseFile')}
        </button>

        {uploading && (
          <TransferProgress
            percent={progress}
            phase={uploadPhase === 'retrying' ? 'retrying' : uploadPhase === 'error' ? 'error' : 'active'}
            activeLabel={status || t('uploadingVault')}
            retryLabel={t('uploadInterrupted')}
          />
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={startUpload}
            disabled={!fileName || uploading}
            className="btn-primary"
          >
            {uploading ? t('uploading') : t('uploadSubmit')}
          </button>
          <span className="text-sm text-[var(--muted)]">
            {fileName ? t('fileReady') : t('noFileSelected')}
          </span>
          {status && !uploading && (
            <span className="text-sm text-[var(--text)]">{status}</span>
          )}
        </div>
      </section>

      <DrawingRegister key={refreshKey} />
        </>
      )}
    </div>
  );
}
