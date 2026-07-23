'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MepSubmittalsTable } from '@/components/mep/MepSubmittalsTable';
import { clientApi } from '@/lib/client-api';
import { uploadDrawingFileMultipart } from '@/lib/resilient-multipart-upload';
import {
  ApprovedVendorRow,
  CSIDivisionRow,
  MaterialSubmittal,
  SpecSectionRow,
} from '@/lib/types';

export function MepSubmittalForm({ onCreated }: { onCreated?: () => void }) {
  const t = useTranslations('mep');
  const tCommon = useTranslations('common');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [divisions, setDivisions] = useState<CSIDivisionRow[]>([]);
  const [vendors, setVendors] = useState<ApprovedVendorRow[]>([]);
  const [specSections, setSpecSections] = useState<SpecSectionRow[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLetter, setUploadingLetter] = useState(false);
  const [message, setMessage] = useState('');

  const [equipmentTag, setEquipmentTag] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [specSectionId, setSpecSectionId] = useState('');
  const [isApprovedVendor, setIsApprovedVendor] = useState(true);
  const [vendorId, setVendorId] = useState('');
  const [proposedVendor, setProposedVendor] = useState('');
  const [equivalenceLetterUrl, setEquivalenceLetterUrl] = useState('');
  const [equivalenceFileName, setEquivalenceFileName] = useState('');
  const [leadTimeWeeks, setLeadTimeWeeks] = useState('');
  const [costDeltaEGP, setCostDeltaEGP] = useState('');

  const selectedDivision = divisions.find((division) => division.id === divisionId);

  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const [divisionRows, vendorRows, specRows] = await Promise.all([
          clientApi<CSIDivisionRow[]>('/catalog/divisions'),
          clientApi<ApprovedVendorRow[]>('/catalog/vendors'),
          clientApi<SpecSectionRow[]>('/catalog/spec-sections'),
        ]);
        setDivisions(divisionRows);
        setVendors(vendorRows);
        setSpecSections(specRows);
        if (divisionRows[0]) {
          setDivisionId(divisionRows[0].id);
        }
      } finally {
        setLoadingCatalog(false);
      }
    }

    void loadCatalog();
  }, []);

  const filteredVendors = useMemo(() => {
    if (!selectedDivision) return vendors;
    return vendors.filter(
      (vendor) => vendor.csiDivision.code === selectedDivision.code,
    );
  }, [vendors, selectedDivision]);

  const filteredSpecs = useMemo(() => {
    if (!selectedDivision) return specSections;
    return specSections.filter(
      (spec) => spec.divisionCode === selectedDivision.code,
    );
  }, [specSections, selectedDivision]);

  useEffect(() => {
    setVendorId('');
    setSpecSectionId('');
  }, [divisionId]);

  useEffect(() => {
    if (isApprovedVendor && vendorId) {
      const vendor = filteredVendors.find((row) => row.id === vendorId);
      if (vendor) {
        setProposedVendor(vendor.name);
      }
    }
  }, [isApprovedVendor, vendorId, filteredVendors]);

  async function onLetterChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLetter(true);
    setMessage('');
    try {
      const { fileUrl } = await uploadDrawingFileMultipart(file);
      setEquivalenceLetterUrl(fileUrl);
      setEquivalenceFileName(file.name);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('submitFailed'));
      setEquivalenceLetterUrl('');
      setEquivalenceFileName('');
    } finally {
      setUploadingLetter(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage('');

    if (!equipmentTag.trim() || !divisionId) {
      setMessage(t('missingRequired'));
      return;
    }

    if (isApprovedVendor && !vendorId) {
      setMessage(t('selectVendorRequired'));
      return;
    }

    if (!isApprovedVendor) {
      if (!proposedVendor.trim()) {
        setMessage(t('vendorNameRequired'));
        return;
      }
      if (!equivalenceLetterUrl.trim()) {
        setMessage(t('equivalenceRequired'));
        return;
      }
    }

    setSubmitting(true);
    try {
      await clientApi<MaterialSubmittal>('/mep/submittals', {
        method: 'POST',
        body: JSON.stringify({
          equipmentTag: equipmentTag.trim(),
          proposedVendor: proposedVendor.trim(),
          isApprovedVendor,
          equivalenceLetterUrl: isApprovedVendor
            ? undefined
            : equivalenceLetterUrl.trim(),
          leadTimeWeeks: leadTimeWeeks ? Number(leadTimeWeeks) : undefined,
          costDeltaEGP: costDeltaEGP ? Number(costDeltaEGP) : undefined,
          divisionId,
          vendorId: isApprovedVendor ? vendorId : undefined,
          specSectionId: specSectionId || undefined,
        }),
      });

      setMessage(t('submittalCreated'));
      setEquipmentTag('');
      setProposedVendor('');
      setVendorId('');
      setSpecSectionId('');
      setEquivalenceLetterUrl('');
      setEquivalenceFileName('');
      setLeadTimeWeeks('');
      setCostDeltaEGP('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onCreated?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('submitFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCatalog) {
    return <p className="text-sm text-[var(--muted)]">{tCommon('loading')}</p>;
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-medium text-[var(--text)]">{t('createSubmittal')}</h2>
      <p className="text-xs text-[var(--muted)] mb-4">{t('createHint')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('equipmentTag')}</span>
            <input
              required
              value={equipmentTag}
              onChange={(event) => setEquipmentTag(event.target.value)}
              placeholder="G1-SLV-EMBED-01"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm font-mono uppercase"
            />
            <span className="mt-1 block text-[10px] text-[var(--muted)]">
              {t('equipmentTagHint')}
            </span>
          </label>

          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('csiDivision')}</span>
            <select
              required
              value={divisionId}
              onChange={(event) => setDivisionId(event.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
            >
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.code} — {division.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('specSection')}</span>
            <select
              value={specSectionId}
              onChange={(event) => setSpecSectionId(event.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
            >
              <option value="">{t('specOptional')}</option>
              {filteredSpecs.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.code} — {spec.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="radio"
              checked={isApprovedVendor}
              onChange={() => setIsApprovedVendor(true)}
            />
            {t('approvedVendor')}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="radio"
              checked={!isApprovedVendor}
              onChange={() => setIsApprovedVendor(false)}
            />
            {t('unlistedVendor')}
          </label>
        </div>

        {isApprovedVendor ? (
          <label className="block max-w-xl">
            <span className="text-xs text-[var(--muted)]">{t('selectVendor')}</span>
            <select
              required
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
            >
              <option value="">{t('selectVendor')}</option>
              {filteredVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                  {vendor.disciplineTag ? ` · ${vendor.disciplineTag}` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-[var(--muted)]">{t('proposedVendor')}</span>
              <input
                required
                value={proposedVendor}
                onChange={(event) => setProposedVendor(event.target.value)}
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
              />
            </label>
            <div>
              <span className="text-xs text-[var(--muted)]">{t('equivalenceLetter')}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf"
                className="hidden"
                onChange={onLetterChosen}
              />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-browse"
                  disabled={uploadingLetter}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {equivalenceFileName || t('uploadEquivalence')}
                </button>
                {uploadingLetter && (
                  <span className="text-xs text-[var(--muted)]">{tCommon('loading')}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('leadTime')}</span>
            <input
              type="number"
              min={0}
              value={leadTimeWeeks}
              onChange={(event) => setLeadTimeWeeks(event.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted)]">{t('costDelta')}</span>
            <input
              type="number"
              value={costDeltaEGP}
              onChange={(event) => setCostDeltaEGP(event.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || uploadingLetter}
            className="btn-primary"
          >
            {submitting ? t('submitting') : t('submitSubmittal')}
          </button>
          {message && (
            <span className="text-sm text-[var(--text)]">{message}</span>
          )}
        </div>
      </form>
    </section>
  );
}

export function MepConsultantPanel() {
  const t = useTranslations('mep');
  const [submittals, setSubmittals] = useState<MaterialSubmittal[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    clientApi<MaterialSubmittal[]>('/mep/submittals')
      .then(setSubmittals)
      .catch(() => setSubmittals([]));
  }, [refreshKey]);

  return (
    <div className="space-y-8">
      <MepSubmittalForm onCreated={() => setRefreshKey((value) => value + 1)} />
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <p className="px-4 py-3 text-sm font-medium text-[var(--text)] border-b border-[var(--border)]">
          {t('mySubmittals')}
        </p>
        <MepSubmittalsTable submittals={submittals} />
      </section>
    </div>
  );
}
