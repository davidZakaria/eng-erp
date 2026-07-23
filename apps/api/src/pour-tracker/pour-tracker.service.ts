import { Injectable, NotFoundException } from '@nestjs/common';
import { TrackerStatus } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.module';
import {
  CreatePourTrackerEntryDto,
  UpdatePourTrackerEntryDto,
} from './dto/pour-tracker.dto';

type PourSeedRow = CreatePourTrackerEntryDto & {
  sourceRow?: number;
  status?: TrackerStatus;
};

@Injectable()
export class PourTrackerService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.pourTrackerEntry.findMany({
      where: { deletedAt: null },
      orderBy: [{ buildingLabel: 'asc' }, { sourceRow: 'asc' }],
      include: {
        loggedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async create(loggedById: string, dto: CreatePourTrackerEntryDto) {
    return this.prisma.pourTrackerEntry.create({
      data: this.toCreateData(dto, loggedById),
      include: {
        loggedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async update(id: string, dto: UpdatePourTrackerEntryDto) {
    await this.require(id);
    return this.prisma.pourTrackerEntry.update({
      where: { id },
      data: this.toUpdateData(dto),
      include: {
        loggedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async softDelete(id: string) {
    await this.require(id);
    return this.prisma.pourTrackerEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async importFromSeed() {
    const path = this.seedPath('jamila-concrete-rebar.json');
    const rows = JSON.parse(readFileSync(path, 'utf-8')) as PourSeedRow[];

    await this.prisma.pourTrackerEntry.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: new Date() },
    });

    let count = 0;
    for (const row of rows) {
      await this.prisma.pourTrackerEntry.create({
        data: {
          buildingLabel: row.buildingLabel,
          halfZone: row.halfZone ?? null,
          floorLevel: row.floorLevel ?? null,
          elementType: row.elementType,
          elementLabel: row.elementLabel ?? null,
          rebarByDiameter: row.rebarByDiameter ?? {},
          concreteM3: row.concreteM3 ?? null,
          rebarCostEGP: row.rebarCostEGP ?? null,
          concreteCostEGP: row.concreteCostEGP ?? null,
          laborCostEGP: row.laborCostEGP ?? null,
          plannedDurationDays: row.plannedDurationDays ?? null,
          plannedStart: row.plannedStart ? new Date(row.plannedStart) : null,
          plannedEnd: row.plannedEnd ? new Date(row.plannedEnd) : null,
          actualPourDate: row.actualPourDate
            ? new Date(row.actualPourDate)
            : null,
          status: (row.status as TrackerStatus) ?? TrackerStatus.PLANNED,
          sourceRow: row.sourceRow ?? null,
        },
      });
      count += 1;
    }

    return { imported: count };
  }

  private async require(id: string) {
    const row = await this.prisma.pourTrackerEntry.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Pour tracker entry not found');
    return row;
  }

  private toCreateData(dto: CreatePourTrackerEntryDto, loggedById: string) {
    return {
      buildingLabel: dto.buildingLabel.trim(),
      halfZone: dto.halfZone?.trim() || null,
      floorLevel: dto.floorLevel?.trim() || null,
      elementType: dto.elementType.trim(),
      elementLabel: dto.elementLabel?.trim() || null,
      rebarByDiameter: dto.rebarByDiameter ?? {},
      concreteM3: dto.concreteM3 ?? null,
      rebarCostEGP: dto.rebarCostEGP ?? null,
      concreteCostEGP: dto.concreteCostEGP ?? null,
      laborCostEGP: dto.laborCostEGP ?? null,
      plannedDurationDays: dto.plannedDurationDays ?? null,
      plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : null,
      plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : null,
      actualPourDate: dto.actualPourDate ? new Date(dto.actualPourDate) : null,
      status: dto.status ?? TrackerStatus.PLANNED,
      notes: dto.notes?.trim() || null,
      loggedById,
    };
  }

  private toUpdateData(dto: UpdatePourTrackerEntryDto) {
    return {
      ...(dto.buildingLabel ? { buildingLabel: dto.buildingLabel.trim() } : {}),
      ...(dto.halfZone !== undefined
        ? { halfZone: dto.halfZone?.trim() || null }
        : {}),
      ...(dto.floorLevel !== undefined
        ? { floorLevel: dto.floorLevel?.trim() || null }
        : {}),
      ...(dto.elementType ? { elementType: dto.elementType.trim() } : {}),
      ...(dto.elementLabel !== undefined
        ? { elementLabel: dto.elementLabel?.trim() || null }
        : {}),
      ...(dto.rebarByDiameter !== undefined
        ? { rebarByDiameter: dto.rebarByDiameter }
        : {}),
      ...(dto.concreteM3 !== undefined ? { concreteM3: dto.concreteM3 } : {}),
      ...(dto.rebarCostEGP !== undefined
        ? { rebarCostEGP: dto.rebarCostEGP }
        : {}),
      ...(dto.concreteCostEGP !== undefined
        ? { concreteCostEGP: dto.concreteCostEGP }
        : {}),
      ...(dto.laborCostEGP !== undefined
        ? { laborCostEGP: dto.laborCostEGP }
        : {}),
      ...(dto.plannedDurationDays !== undefined
        ? { plannedDurationDays: dto.plannedDurationDays }
        : {}),
      ...(dto.plannedStart !== undefined
        ? {
            plannedStart: dto.plannedStart
              ? new Date(dto.plannedStart)
              : null,
          }
        : {}),
      ...(dto.plannedEnd !== undefined
        ? { plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : null }
        : {}),
      ...(dto.actualPourDate !== undefined
        ? {
            actualPourDate: dto.actualPourDate
              ? new Date(dto.actualPourDate)
              : null,
          }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
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
