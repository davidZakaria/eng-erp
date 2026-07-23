'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ApprovedVendorRow,
  CSIDivisionRow,
  ElectricalPanelRow,
  PanelCircuitRow,
  SpecSectionRow,
} from '@/lib/types';
import { clientApi } from '@/lib/client-api';

type CatalogView = 'specs' | 'vendors' | 'panels';

export function CatalogManageTab({ editable = false }: { editable?: boolean }) {
  const t = useTranslations('catalog');
  const tAdmin = useTranslations('admin');
  const tCsi = useTranslations('csiDivisions');
  const tCommon = useTranslations('common');
  const [view, setView] = useState<CatalogView>('specs');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [specs, setSpecs] = useState<SpecSectionRow[]>([]);
  const [vendors, setVendors] = useState<ApprovedVendorRow[]>([]);
  const [panels, setPanels] = useState<ElectricalPanelRow[]>([]);
  const [divisions, setDivisions] = useState<CSIDivisionRow[]>([]);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingSpec, setEditingSpec] = useState<SpecSectionRow | null>(null);
  const [editingVendor, setEditingVendor] = useState<ApprovedVendorRow | null>(null);
  const [editingPanel, setEditingPanel] = useState<ElectricalPanelRow | null>(null);
  const [circuitPanelId, setCircuitPanelId] = useState<string | null>(null);

  const [specForm, setSpecForm] = useState({
    code: '',
    title: '',
    divisionCode: '03',
    fileUrl: '',
  });
  const [vendorForm, setVendorForm] = useState({
    name: '',
    divisionCode: '03',
    country: 'Egypt',
    disciplineTag: '',
  });
  const [panelForm, setPanelForm] = useState({
    panelReference: '',
    location: '',
    incomingCB: '',
  });
  const [circuitForm, setCircuitForm] = useState({
    circuitNumber: 1,
    mcbRating: 16,
    wireSize: '2.5mm²',
    loadType: 'Lighting',
    connectedLoadVA: 1000,
    demandFactor: 0.8,
    phase: 'R',
  });

  const divisionQuery = divisionFilter
    ? `?divisionCode=${encodeURIComponent(divisionFilter)}`
    : '';

  async function loadAll() {
    setLoading(true);
    try {
      const [specRows, vendorRows, panelRows, divisionRows] = await Promise.all([
        clientApi<SpecSectionRow[]>(`/catalog/spec-sections${divisionQuery}`),
        clientApi<ApprovedVendorRow[]>(`/catalog/vendors${divisionQuery}`),
        clientApi<ElectricalPanelRow[]>('/catalog/panels'),
        clientApi<CSIDivisionRow[]>('/catalog/divisions'),
      ]);
      setSpecs(specRows);
      setVendors(vendorRows);
      setPanels(panelRows);
      setDivisions(divisionRows);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll().catch(() => {});
  }, [divisionFilter, divisionQuery]);

  const divisionOptions = useMemo(() => {
    const codes = new Set<string>();
    divisions.forEach((d) => codes.add(d.code));
    specs.forEach((s) => codes.add(s.divisionCode));
    return [...codes].sort();
  }, [divisions, specs]);

  function divisionTitle(code: string): string {
    return tCsi.has(code) ? tCsi(code) : code;
  }

  async function saveSpec(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      if (creating) {
        await clientApi('/catalog/spec-sections', {
          method: 'POST',
          body: JSON.stringify(specForm),
        });
      } else if (editingSpec) {
        await clientApi(`/catalog/spec-sections/${editingSpec.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: specForm.title,
            divisionCode: specForm.divisionCode,
            fileUrl: specForm.fileUrl || undefined,
          }),
        });
      }
      setCreating(false);
      setEditingSpec(null);
      await loadAll();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : tAdmin('saveFailed'));
    }
  }

  async function saveVendor(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      if (creating) {
        await clientApi('/catalog/vendors', {
          method: 'POST',
          body: JSON.stringify(vendorForm),
        });
      } else if (editingVendor) {
        await clientApi(`/catalog/vendors/${editingVendor.id}`, {
          method: 'PATCH',
          body: JSON.stringify(vendorForm),
        });
      }
      setCreating(false);
      setEditingVendor(null);
      await loadAll();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : tAdmin('saveFailed'));
    }
  }

  async function savePanel(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      if (creating) {
        await clientApi('/catalog/panels', {
          method: 'POST',
          body: JSON.stringify(panelForm),
        });
      } else if (editingPanel) {
        await clientApi(`/catalog/panels/${editingPanel.id}`, {
          method: 'PATCH',
          body: JSON.stringify(panelForm),
        });
      }
      setCreating(false);
      setEditingPanel(null);
      await loadAll();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : tAdmin('saveFailed'));
    }
  }

  async function saveCircuit(e: FormEvent) {
    e.preventDefault();
    if (!circuitPanelId) return;
    setMessage('');
    try {
      await clientApi(`/catalog/panels/${circuitPanelId}/circuits`, {
        method: 'POST',
        body: JSON.stringify(circuitForm),
      });
      setCircuitPanelId(null);
      await loadAll();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : tAdmin('saveFailed'));
    }
  }

  async function removeSpec(id: string) {
    if (!confirm(tAdmin('confirmDelete'))) return;
    await clientApi(`/catalog/spec-sections/${id}`, { method: 'DELETE' });
    await loadAll();
  }

  async function removeVendor(id: string) {
    if (!confirm(tAdmin('confirmDelete'))) return;
    await clientApi(`/catalog/vendors/${id}`, { method: 'DELETE' });
    await loadAll();
  }

  async function removePanel(id: string) {
    if (!confirm(tAdmin('confirmDelete'))) return;
    await clientApi(`/catalog/panels/${id}`, { method: 'DELETE' });
    await loadAll();
  }

  async function removeCircuit(id: string) {
    if (!confirm(tAdmin('confirmDelete'))) return;
    await clientApi(`/catalog/circuits/${id}`, { method: 'DELETE' });
    await loadAll();
  }

  function openCreateSpec() {
    setCreating(true);
    setEditingSpec(null);
    setEditingVendor(null);
    setEditingPanel(null);
    setSpecForm({ code: '', title: '', divisionCode: '03', fileUrl: '' });
  }

  function openEditSpec(row: SpecSectionRow) {
    setEditingSpec(row);
    setCreating(false);
    setSpecForm({
      code: row.code,
      title: row.title,
      divisionCode: row.divisionCode,
      fileUrl: row.fileUrl ?? '',
    });
  }

  function openCreateVendor() {
    setCreating(true);
    setEditingVendor(null);
    setEditingSpec(null);
    setEditingPanel(null);
    setVendorForm({ name: '', divisionCode: '03', country: 'Egypt', disciplineTag: '' });
  }

  function openEditVendor(row: ApprovedVendorRow) {
    setEditingVendor(row);
    setCreating(false);
    setVendorForm({
      name: row.name,
      divisionCode: row.csiDivision.code,
      country: row.country ?? '',
      disciplineTag: row.disciplineTag ?? '',
    });
  }

  function openCreatePanel() {
    setCreating(true);
    setEditingPanel(null);
    setPanelForm({ panelReference: '', location: '', incomingCB: '' });
  }

  function openEditPanel(row: ElectricalPanelRow) {
    setEditingPanel(row);
    setCreating(false);
    setPanelForm({
      panelReference: row.panelReference,
      location: row.location,
      incomingCB: row.incomingCB,
    });
  }

  const subTabs: { id: CatalogView; label: string }[] = [
    { id: 'specs', label: t('specSections') },
    { id: 'vendors', label: t('approvedVendors') },
    { id: 'panels', label: t('loadSchedules') },
  ];

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">
          {editable ? tAdmin('catalogManageHint') : t('hint')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
            {t('filterDivision')}
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] px-2 py-1 text-xs"
            >
              <option value="">{t('allDivisions')}</option>
              {divisionOptions.map((code) => (
                <option key={code} value={code}>
                  {code} — {divisionTitle(code)}
                </option>
              ))}
            </select>
          </label>
          {editable && (
            <button
              type="button"
              className="btn-primary !px-3 !py-1 !text-xs"
              onClick={() => {
                if (view === 'specs') openCreateSpec();
                else if (view === 'vendors') openCreateVendor();
                else openCreatePanel();
              }}
            >
              {tCommon('add')}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 px-4 pt-3 border-b border-[var(--border)] overflow-x-auto">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setView(tab.id);
              setCreating(false);
              setEditingSpec(null);
              setEditingVendor(null);
              setEditingPanel(null);
            }}
            className={`px-3 py-2 text-xs border-b-2 -mb-px whitespace-nowrap ${
              view === tab.id
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--muted)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {editable && (creating || editingSpec) && view === 'specs' && (
        <form onSubmit={saveSpec} className="p-4 grid gap-3 sm:grid-cols-2 border-b border-[var(--border)]">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('sectionCode')}</span>
            <input
              required
              disabled={!!editingSpec}
              value={specForm.code}
              onChange={(e) => setSpecForm((f) => ({ ...f, code: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{tCommon('title')}</span>
            <input
              required
              value={specForm.title}
              onChange={(e) => setSpecForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('division')}</span>
            <select
              value={specForm.divisionCode}
              onChange={(e) => setSpecForm((f) => ({ ...f, divisionCode: e.target.value }))}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.code} — {d.title}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">{tCommon('save')}</button>
            <button type="button" className="btn-secondary" onClick={() => { setCreating(false); setEditingSpec(null); }}>{tCommon('cancel')}</button>
          </div>
        </form>
      )}

      {editable && (creating || editingVendor) && view === 'vendors' && (
        <form onSubmit={saveVendor} className="p-4 grid gap-3 sm:grid-cols-2 border-b border-[var(--border)]">
          <label className="block text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">{t('vendorName')}</span>
            <input required value={vendorForm.name} onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('division')}</span>
            <select value={vendorForm.divisionCode} onChange={(e) => setVendorForm((f) => ({ ...f, divisionCode: e.target.value }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2">
              {divisions.map((d) => (<option key={d.id} value={d.code}>{d.code} — {d.title}</option>))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('disciplineTag')}</span>
            <input value={vendorForm.disciplineTag} onChange={(e) => setVendorForm((f) => ({ ...f, disciplineTag: e.target.value }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2" />
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">{tCommon('save')}</button>
            <button type="button" className="btn-secondary" onClick={() => { setCreating(false); setEditingVendor(null); }}>{tCommon('cancel')}</button>
          </div>
        </form>
      )}

      {editable && (creating || editingPanel) && view === 'panels' && (
        <form onSubmit={savePanel} className="p-4 grid gap-3 sm:grid-cols-3 border-b border-[var(--border)]">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('panelRef')}</span>
            <input required value={panelForm.panelReference} onChange={(e) => setPanelForm((f) => ({ ...f, panelReference: e.target.value }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 font-mono" />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('location')}</span>
            <input required value={panelForm.location} onChange={(e) => setPanelForm((f) => ({ ...f, location: e.target.value }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">{t('incomingCb')}</span>
            <input required value={panelForm.incomingCB} onChange={(e) => setPanelForm((f) => ({ ...f, incomingCB: e.target.value }))} className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2" />
          </label>
          <div className="sm:col-span-3 flex gap-2">
            <button type="submit" className="btn-primary">{tCommon('save')}</button>
            <button type="button" className="btn-secondary" onClick={() => { setCreating(false); setEditingPanel(null); }}>{tCommon('cancel')}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="px-4 py-8 text-sm text-[var(--muted)]">{tCommon('loading')}</p>
      ) : view === 'specs' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3">{t('sectionCode')}</th>
                <th className="text-start px-4 py-3">{tCommon('title')}</th>
                <th className="text-start px-4 py-3">{t('division')}</th>
                {editable && <th className="text-end px-4 py-3">{tCommon('actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {specs.map((spec) => (
                <tr key={spec.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-mono">{spec.code}</td>
                  <td className="px-4 py-3">{spec.title}</td>
                  <td className="px-4 py-3 text-xs">{spec.divisionCode} — {divisionTitle(spec.divisionCode)}</td>
                  {editable && (
                    <td className="px-4 py-3 text-end space-x-2 rtl:space-x-reverse">
                      <button type="button" className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => openEditSpec(spec)}>{tCommon('edit')}</button>
                      <button type="button" className="btn-danger !px-2 !py-1 !text-xs" onClick={() => removeSpec(spec.id)}>{tCommon('delete')}</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === 'vendors' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
              <tr>
                <th className="text-start px-4 py-3">{t('vendorName')}</th>
                <th className="text-start px-4 py-3">{t('disciplineTag')}</th>
                <th className="text-start px-4 py-3">{t('division')}</th>
                {editable && <th className="text-end px-4 py-3">{tCommon('actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">{vendor.name}</td>
                  <td className="px-4 py-3 text-xs">{vendor.disciplineTag ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{vendor.csiDivision.code} — {vendor.csiDivision.title}</td>
                  {editable && (
                    <td className="px-4 py-3 text-end space-x-2 rtl:space-x-reverse">
                      <button type="button" className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => openEditVendor(vendor)}>{tCommon('edit')}</button>
                      <button type="button" className="btn-danger !px-2 !py-1 !text-xs" onClick={() => removeVendor(vendor.id)}>{tCommon('delete')}</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {panels.map((panel) => {
            const open = expandedPanel === panel.id;
            return (
              <div key={panel.id}>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setExpandedPanel(open ? null : panel.id)} className="flex-1 text-start">
                    <p className="font-mono font-medium">{panel.panelReference}</p>
                    <p className="text-xs text-[var(--muted)]">{panel.location} · {panel.circuits.length} {t('circuits')}</p>
                  </button>
                  {editable && (
                    <div className="flex gap-2 shrink-0">
                      <button type="button" className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => openEditPanel(panel)}>{tCommon('edit')}</button>
                      <button type="button" className="btn-danger !px-2 !py-1 !text-xs" onClick={() => removePanel(panel.id)}>{tCommon('delete')}</button>
                      <button type="button" className="btn-primary !px-2 !py-1 !text-xs" onClick={() => { setCircuitPanelId(panel.id); setExpandedPanel(panel.id); }}>{t('addCircuit')}</button>
                    </div>
                  )}
                </div>
                {circuitPanelId === panel.id && editable && (
                  <form onSubmit={saveCircuit} className="px-4 pb-3 grid gap-2 sm:grid-cols-4 border-t border-[var(--border)] bg-[var(--surface-elevated)]/30">
                    <input type="number" required min={1} value={circuitForm.circuitNumber} onChange={(e) => setCircuitForm((f) => ({ ...f, circuitNumber: Number(e.target.value) }))} className="rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-xs" placeholder={t('circuit')} />
                    <input value={circuitForm.loadType} onChange={(e) => setCircuitForm((f) => ({ ...f, loadType: e.target.value }))} className="rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-xs" placeholder={t('loadType')} />
                    <select value={circuitForm.phase} onChange={(e) => setCircuitForm((f) => ({ ...f, phase: e.target.value }))} className="rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-xs">
                      <option value="R">R</option><option value="Y">Y</option><option value="B">B</option>
                    </select>
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary !px-2 !py-1 !text-xs">{tCommon('save')}</button>
                      <button type="button" className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => setCircuitPanelId(null)}>{tCommon('cancel')}</button>
                    </div>
                  </form>
                )}
                {open && (
                  <div className="overflow-x-auto border-t border-[var(--border)]">
                    <table className="w-full text-xs min-w-[640px]">
                      <thead className="bg-[var(--surface-elevated)] text-[var(--muted)]">
                        <tr>
                          <th className="text-start px-4 py-2">{t('circuit')}</th>
                          <th className="text-start px-4 py-2">{t('loadType')}</th>
                          <th className="text-start px-4 py-2">{t('phase')}</th>
                          {editable && <th className="text-end px-4 py-2">{tCommon('actions')}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {panel.circuits.map((circuit: PanelCircuitRow) => (
                          <tr key={circuit.id} className="border-t border-[var(--border)]">
                            <td className="px-4 py-2 font-mono">{circuit.circuitNumber}</td>
                            <td className="px-4 py-2">{circuit.loadType}</td>
                            <td className="px-4 py-2 font-mono">{circuit.phase}</td>
                            {editable && (
                              <td className="px-4 py-2 text-end">
                                <button type="button" className="btn-danger !px-2 !py-1 !text-xs" onClick={() => removeCircuit(circuit.id)}>{tCommon('delete')}</button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {message && <p className="px-4 py-3 text-sm text-[var(--danger)]">{message}</p>}
    </section>
  );
}
