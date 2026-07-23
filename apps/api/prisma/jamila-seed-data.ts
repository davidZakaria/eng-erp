import {
  Discipline,
  ItemStatus,
  PanelPhase,
  PrismaClient,
  Role,
  User,
} from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface JamilaData {
  project: {
    name: string;
    code: string;
    client: string;
    location: string;
    buildingType: string;
    projectNumber: string;
  };
  csiDivisions: { code: string; title: string }[];
  vendors: {
    name: string;
    country: string;
    divisionCode: string;
    disciplineTag?: string;
  }[];
  specSections: { code: string; title: string; divisionCode: string }[];
  architecturalLod: LodRow[];
  electricalLod: LodRow[];
  architecturalBoq: BoqRow[];
  structuralBoq: BoqRow[];
  plumbingBoq: BoqRow[];
  fireFightingBoq: BoqRow[];
  electricalPanels: PanelRow[];
}

interface LodRow {
  projectNo: string;
  disciplineCode: string;
  sheetNumber: string;
  title: string;
  revision: number;
  size?: string | null;
  scale?: string | null;
  status?: string | null;
}

interface BoqRow {
  itemCode: string;
  description: string;
  unit: string;
  plannedQuantity: number;
  rateEGP: number;
  divisionCode?: string;
  divisionSheet?: string;
}

interface PanelRow {
  panelReference: string;
  location: string;
  incomingCB: string;
  circuits: {
    circuitNumber: number;
    mcbRating: number;
    wireSize: string;
    loadType: string;
    connectedLoadVA: number;
    demandFactor: number;
    phase: string;
  }[];
}

export function loadJamilaData(): JamilaData {
  const path = join(__dirname, 'seed-data', 'jamila-from-sample.json');
  return JSON.parse(readFileSync(path, 'utf-8')) as JamilaData;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${value.replace(/[^a-zA-Z0-9.-]/g, '-').slice(0, 48)}`;
}

function mapDisciplineCode(code: string): Discipline {
  const c = code.toUpperCase();
  if (['AE', 'AD', 'AR'].includes(c)) return Discipline.ARCHITECTURAL;
  if (['SE', 'STR', 'ST'].includes(c)) return Discipline.STRUCTURAL;
  return Discipline.MEP;
}

/** Map LOD register status from Excel only — no synthetic demo overrides. */
function mapLodStatus(lodStatus: string | null | undefined): ItemStatus {
  const s = (lodStatus ?? '').trim().toUpperCase();
  if (s.startsWith('DONE')) return ItemStatus.APPROVED_FOR_CONSTRUCTION;
  if (s.includes('IFC') || s.includes('FOR CONSTRUCTION')) {
    return ItemStatus.APPROVED_FOR_CONSTRUCTION;
  }
  if (s.includes('REV') || s.includes('REVISION')) {
    return ItemStatus.REVISION_REQUESTED;
  }
  return ItemStatus.PENDING_REVIEW;
}

/** Remove synthetic showcase rows so only Excel-derived catalog data remains. */
export async function clearSyntheticSeedData(prisma: PrismaClient) {
  await prisma.executionLog.deleteMany({});
  await prisma.modelReview.deleteMany({});
  await prisma.modelSubmission.deleteMany({});
  await prisma.materialSubmittal.deleteMany({});
  await prisma.siteDefect.deleteMany({});
  await prisma.rFI.deleteMany({});
  await prisma.nonConformanceReport.deleteMany({});
  await prisma.pourClearance.deleteMany({});
  await prisma.componentBOQ.deleteMany({});
  await prisma.buildingComponent.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.systemBackup.deleteMany({});
  await prisma.panelCircuit.deleteMany({});
  await prisma.electricalPanel.deleteMany({});
  await prisma.drawing.deleteMany({});
  await prisma.bOQItem.deleteMany({});
  await prisma.approvedVendor.deleteMany({});
  await prisma.specSection.deleteMany({ where: { deletedAt: null } });
}

export async function seedJamilaCatalog(
  prisma: PrismaClient,
  jamila: JamilaData,
  users: User[],
  fileUrls: { dwg: string; dxf: string; pdf: string },
) {
  const byRole = (role: Role) =>
    users.find((u) => u.role === role) ?? users[0];
  const arch = byRole(Role.ARCH_CONSULTANT);
  const mep = byRole(Role.MEP_CONSULTANT);
  const struct = byRole(Role.STRUCT_CONSULTANT);

  const packageName = `Construction Package ${jamila.project.buildingType}`;

  const divisionMap = new Map<string, string>();
  for (const div of jamila.csiDivisions) {
    const row = await prisma.cSIDivision.upsert({
      where: { code: div.code },
      update: { title: div.title },
      create: { code: div.code, title: div.title },
    });
    divisionMap.set(div.code, row.id);
  }

  for (const spec of jamila.specSections ?? []) {
    await prisma.specSection.upsert({
      where: { code: spec.code },
      update: {
        title: spec.title,
        divisionCode: spec.divisionCode,
        fileUrl: `specs/jamila/${spec.code}.pdf`,
        deletedAt: null,
      },
      create: {
        code: spec.code,
        title: spec.title,
        divisionCode: spec.divisionCode,
        fileUrl: `specs/jamila/${spec.code}.pdf`,
      },
    });
  }

  const vendorMap = new Map<string, string>();
  for (const vendor of jamila.vendors) {
    const divisionId = divisionMap.get(vendor.divisionCode);
    if (!divisionId) continue;
    const id = stableId('seed-vendor', vendor.name);
    const row = await prisma.approvedVendor.upsert({
      where: { id },
      update: {
        name: vendor.name,
        country: vendor.country,
        disciplineTag: vendor.disciplineTag ?? null,
        divisionId,
      },
      create: {
        id,
        name: vendor.name,
        country: vendor.country,
        disciplineTag: vendor.disciplineTag ?? null,
        divisionId,
      },
    });
    vendorMap.set(vendor.name, row.id);
  }

  const allBoq: BoqRow[] = [
    ...jamila.architecturalBoq,
    ...jamila.structuralBoq,
    ...jamila.plumbingBoq,
    ...jamila.fireFightingBoq,
  ];

  for (const item of allBoq) {
    const divisionCode =
      item.divisionCode ??
      (item.divisionSheet ? item.divisionSheet.replace(/\D/g, '').slice(0, 2) : '03');
    const id = stableId('seed-boq', `${divisionCode}-${item.itemCode}`);
    await prisma.bOQItem.upsert({
      where: { id },
      update: {
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        plannedQuantity: item.plannedQuantity,
        rateEGP: item.rateEGP,
        divisionCode,
        actualQuantity: 0,
      },
      create: {
        id,
        itemCode: item.itemCode,
        description: item.description,
        unit: item.unit,
        plannedQuantity: item.plannedQuantity,
        rateEGP: item.rateEGP,
        divisionCode,
        actualQuantity: 0,
      },
    });
  }

  for (const panel of jamila.electricalPanels) {
    const created = await prisma.electricalPanel.create({
      data: {
        panelReference: panel.panelReference,
        location: panel.location,
        incomingCB: panel.incomingCB,
        isUnbalanced: false,
      },
    });

    if (panel.circuits.length > 0) {
      await prisma.panelCircuit.createMany({
        data: panel.circuits.map((c) => ({
          panelId: created.id,
          circuitNumber: c.circuitNumber,
          mcbRating: c.mcbRating,
          wireSize: c.wireSize,
          loadType: c.loadType,
          connectedLoadVA: c.connectedLoadVA,
          demandFactor: c.demandFactor,
          phase: c.phase as PanelPhase,
        })),
      });
    }
  }

  const lodRows: LodRow[] = [
    ...jamila.architecturalLod,
    ...jamila.electricalLod,
  ];

  for (const lod of lodRows) {
    const drawingNumber = `${lod.disciplineCode}-${lod.sheetNumber}`
      .toUpperCase()
      .replace(/\s+/g, '');
    const discipline = mapDisciplineCode(lod.disciplineCode);
    const uploaderId =
      discipline === Discipline.ARCHITECTURAL
        ? arch.id
        : discipline === Discipline.STRUCTURAL
          ? struct.id
          : mep.id;
    const fileUrl =
      discipline === Discipline.ARCHITECTURAL
        ? fileUrls.dwg
        : discipline === Discipline.STRUCTURAL
          ? fileUrls.dxf
          : fileUrls.pdf;

    const status = mapLodStatus(lod.status);

    await prisma.drawing.upsert({
      where: {
        drawingNumber_revision: {
          drawingNumber,
          revision: lod.revision,
        },
      },
      update: {
        title: lod.title,
        discipline,
        status,
        fileUrl,
        projectNumber: lod.projectNo || jamila.project.projectNumber,
        disciplineCode: lod.disciplineCode,
        sheetNumber: lod.sheetNumber,
        sheetSize: lod.size ?? null,
        scale: lod.scale ?? null,
        packageName,
      },
      create: {
        drawingNumber,
        title: lod.title,
        discipline,
        revision: lod.revision,
        status,
        fileUrl,
        uploaderId,
        projectNumber: lod.projectNo || jamila.project.projectNumber,
        disciplineCode: lod.disciplineCode,
        sheetNumber: lod.sheetNumber,
        sheetSize: lod.size ?? null,
        scale: lod.scale ?? null,
        packageName,
      },
    });
  }

  return {
    divisionMap,
    vendorMap,
    boqCount: allBoq.length,
    panelCount: jamila.electricalPanels.length,
    drawingCount: lodRows.length,
    specCount: jamila.specSections?.length ?? 0,
  };
}
