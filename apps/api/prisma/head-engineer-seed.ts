import { PrismaClient, TrackerStatus } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function seedFile(name: string): string {
  const candidates = [
    join(__dirname, 'seed-data', name),
    join(process.cwd(), 'prisma/seed-data', name),
    join(process.cwd(), 'apps/api/prisma/seed-data', name),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error(`Missing seed file: ${name}`);
}

export async function seedHeadEngineerTrackers(prisma: PrismaClient) {
  if (!existsSync(seedFile('jamila-concrete-rebar.json'))) {
    console.warn('Skipping head-engineer trackers — run npm run extract:head-engineer');
    return;
  }

  await prisma.pourTrackerEntry.deleteMany({});
  await prisma.scheduleBuildingProgress.deleteMany({});
  await prisma.scheduleLine.deleteMany({});
  await prisma.schedulePlan.deleteMany({});

  const pourRows = JSON.parse(
    readFileSync(seedFile('jamila-concrete-rebar.json'), 'utf-8'),
  ) as Array<Record<string, unknown>>;

  for (const row of pourRows) {
    await prisma.pourTrackerEntry.create({
      data: {
        buildingLabel: String(row.buildingLabel),
        halfZone: (row.halfZone as string | null) ?? null,
        floorLevel: (row.floorLevel as string | null) ?? null,
        elementType: String(row.elementType),
        elementLabel: (row.elementLabel as string | null) ?? null,
        rebarByDiameter: (row.rebarByDiameter as object) ?? {},
        concreteM3: (row.concreteM3 as number | null) ?? null,
        rebarCostEGP: (row.rebarCostEGP as number | null) ?? null,
        concreteCostEGP: (row.concreteCostEGP as number | null) ?? null,
        laborCostEGP: (row.laborCostEGP as number | null) ?? null,
        plannedDurationDays: (row.plannedDurationDays as number | null) ?? null,
        plannedStart: row.plannedStart
          ? new Date(String(row.plannedStart))
          : null,
        plannedEnd: row.plannedEnd ? new Date(String(row.plannedEnd)) : null,
        actualPourDate: row.actualPourDate
          ? new Date(String(row.actualPourDate))
          : null,
        status: (row.status as TrackerStatus) ?? TrackerStatus.PLANNED,
        sourceRow: (row.sourceRow as number | null) ?? null,
      },
    });
  }

  const schedulePayload = JSON.parse(
    readFileSync(seedFile('jura-schedule.json'), 'utf-8'),
  ) as {
    plan: {
      name: string;
      projectLabel?: string;
      planDeadline?: string | null;
      buildingCodes: string[];
    };
    lines: Array<{
      itemCode: string;
      parentCode?: string | null;
      description: string;
      unit?: string | null;
      categoryLabel?: string | null;
      sortOrder: number;
      progress: Array<{
        buildingCode: string;
        quantity?: number | null;
        rateEGP?: number | null;
        durationDays?: number | null;
        startDate?: string | null;
        endDate?: string | null;
        lineTotalEGP?: number | null;
        status?: string | null;
      }>;
    }>;
  };

  const plan = await prisma.schedulePlan.create({
    data: {
      name: schedulePayload.plan.name,
      projectLabel: schedulePayload.plan.projectLabel ?? null,
      planDeadline: schedulePayload.plan.planDeadline
        ? new Date(schedulePayload.plan.planDeadline)
        : null,
      buildingCodes: schedulePayload.plan.buildingCodes,
    },
  });

  for (const line of schedulePayload.lines) {
    const created = await prisma.scheduleLine.create({
      data: {
        planId: plan.id,
        itemCode: line.itemCode,
        parentCode: line.parentCode ?? null,
        description: line.description,
        unit: line.unit ?? null,
        categoryLabel: line.categoryLabel ?? null,
        sortOrder: line.sortOrder,
      },
    });

    for (const p of line.progress) {
      await prisma.scheduleBuildingProgress.create({
        data: {
          lineId: created.id,
          buildingCode: p.buildingCode,
          quantity: p.quantity ?? null,
          rateEGP: p.rateEGP ?? null,
          durationDays: p.durationDays ?? null,
          startDate: p.startDate ? new Date(p.startDate) : null,
          endDate: p.endDate ? new Date(p.endDate) : null,
          lineTotalEGP: p.lineTotalEGP ?? null,
          status: p.status ?? null,
        },
      });
    }
  }

  console.log(
    `Head-engineer trackers: ${pourRows.length} pour rows, ${schedulePayload.lines.length} schedule lines`,
  );
}
