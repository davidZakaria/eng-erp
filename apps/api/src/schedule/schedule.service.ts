import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.module';

type ProgressSeed = {
  buildingCode: string;
  quantity?: number | null;
  rateEGP?: number | null;
  durationDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  lineTotalEGP?: number | null;
  status?: string | null;
};

type LineSeed = {
  itemCode: string;
  parentCode?: string | null;
  description: string;
  unit?: string | null;
  categoryLabel?: string | null;
  sortOrder: number;
  progress: ProgressSeed[];
};

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async findPlans() {
    return this.prisma.schedulePlan.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { lines: true } } },
    });
  }

  async findPlanWithLines(planId: string) {
    const plan = await this.prisma.schedulePlan.findFirst({
      where: { id: planId, deletedAt: null },
      include: {
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: { progress: { orderBy: { buildingCode: 'asc' } } },
        },
      },
    });
    if (!plan) throw new NotFoundException('Schedule plan not found');
    return plan;
  }

  async updateProgress(
    progressId: string,
    data: Partial<{
      quantity: number;
      rateEGP: number;
      durationDays: number;
      startDate: string;
      endDate: string;
      status: string;
    }>,
  ) {
    const existing = await this.prisma.scheduleBuildingProgress.findUnique({
      where: { id: progressId },
    });
    if (!existing) throw new NotFoundException('Schedule progress not found');

    return this.prisma.scheduleBuildingProgress.update({
      where: { id: progressId },
      data: {
        ...(data.quantity != null ? { quantity: data.quantity } : {}),
        ...(data.rateEGP != null ? { rateEGP: data.rateEGP } : {}),
        ...(data.durationDays != null ? { durationDays: data.durationDays } : {}),
        ...(data.startDate !== undefined
          ? { startDate: data.startDate ? new Date(data.startDate) : null }
          : {}),
        ...(data.endDate !== undefined
          ? { endDate: data.endDate ? new Date(data.endDate) : null }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  async importFromSeed() {
    const path = this.seedPath('jura-schedule.json');
    const payload = JSON.parse(readFileSync(path, 'utf-8')) as {
      plan: {
        name: string;
        projectLabel?: string;
        planDeadline?: string | null;
        buildingCodes: string[];
      };
      lines: LineSeed[];
    };

    await this.prisma.schedulePlan.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: new Date() },
    });

    const plan = await this.prisma.schedulePlan.create({
      data: {
        name: payload.plan.name,
        projectLabel: payload.plan.projectLabel ?? null,
        planDeadline: payload.plan.planDeadline
          ? new Date(payload.plan.planDeadline)
          : null,
        buildingCodes: payload.plan.buildingCodes,
      },
    });

    for (const line of payload.lines) {
      const created = await this.prisma.scheduleLine.create({
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
        await this.prisma.scheduleBuildingProgress.create({
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

    return {
      planId: plan.id,
      importedLines: payload.lines.length,
    };
  }

  private seedPath(filename: string) {
    const candidates = [
      join(process.cwd(), 'prisma/seed-data', filename),
      join(process.cwd(), 'apps/api/prisma/seed-data', filename),
      join(__dirname, '../../prisma/seed-data', filename),
    ];
    for (const path of candidates) {
      if (existsSync(path)) return path;
    }
    throw new NotFoundException(`Seed file not found: ${filename}`);
  }
}
