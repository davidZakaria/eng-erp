import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemStatus, PourClearance } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { UpdatePourChecklistDto } from './dto/update-pour-checklist.dto';

@Injectable()
export class StructuralService {
  constructor(private prisma: PrismaService) {}

  async findAllPourClearances() {
    const clearances = await this.prisma.pourClearance.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(clearances.map((c) => this.syncPourClearanceLocks(c)));
  }

  findPourClearance(id: string) {
    return this.prisma.pourClearance.findUnique({ where: { id } });
  }

  async updateChecklist(id: string, dto: UpdatePourChecklistDto) {
    const existing = await this.syncPourClearanceLocks(
      await this.requirePourClearance(id),
    );

    if (existing.isLockedByNCR || existing.isLockedByMEP || existing.isLockedByDefect) {
      throw new ForbiddenException(this.lockMessage(existing));
    }

    return this.prisma.pourClearance.update({
      where: { id },
      data: {
        formworkApproved: dto.formworkApproved,
        rebarApproved: dto.rebarApproved,
        ptCablesXApproved: dto.ptCablesXApproved,
        ptCablesYApproved: dto.ptCablesYApproved,
      },
    });
  }

  async approvePour(id: string) {
    const clearance = await this.syncPourClearanceLocks(
      await this.requirePourClearance(id),
    );

    if (clearance.isLockedByNCR) {
      throw new ForbiddenException(
        'ZONE LOCKED: High-severity NCR is open.',
      );
    }

    if (clearance.isLockedByMEP) {
      throw new ForbiddenException(
        'Cannot clear pour. MEP Submittals (Sleeves/Embeds) are still pending.',
      );
    }

    if (clearance.isLockedByDefect) {
      throw new ForbiddenException(
        'ZONE LOCKED: High-Severity Site Defect Open. Fix defect to unlock pour clearance.',
      );
    }

    const allApproved =
      clearance.formworkApproved &&
      clearance.rebarApproved &&
      clearance.ptCablesXApproved &&
      clearance.ptCablesYApproved;

    if (!allApproved) {
      throw new ForbiddenException('Incomplete structural checklist.');
    }

    return this.prisma.pourClearance.update({
      where: { id },
      data: { status: 'CLEAR_TO_POUR' },
    });
  }

  private async requirePourClearance(id: string) {
    const clearance = await this.prisma.pourClearance.findUnique({
      where: { id },
    });

    if (!clearance) {
      throw new NotFoundException('Pour clearance record not found');
    }

    return clearance;
  }

  private async syncPourClearanceLocks(clearance: PourClearance) {
    const openHighNcr = await this.prisma.nonConformanceReport.findFirst({
      where: {
        floorLevel: clearance.floorLevel,
        status: 'OPEN',
        severity: 'HIGH',
      },
    });

    const zoneKey = clearance.zone.replace(/^Building\s+/i, '').trim();
    const pendingMep = await this.prisma.materialSubmittal.findFirst({
      where: {
        status: {
          in: [ItemStatus.PENDING_REVIEW, ItemStatus.DEVIATION_PENDING_OWNER],
        },
        equipmentTag: { contains: zoneKey, mode: 'insensitive' },
      },
    });

    const openHighDefect = await this.prisma.siteDefect.findFirst({
      where: {
        location: clearance.zone,
        severity: 'HIGH',
        status: 'OPEN',
      },
    });

    const isLockedByNCR = !!openHighNcr;
    const isLockedByMEP = !!pendingMep;
    const isLockedByDefect = !!openHighDefect;

    if (
      clearance.isLockedByNCR !== isLockedByNCR ||
      clearance.isLockedByMEP !== isLockedByMEP ||
      clearance.isLockedByDefect !== isLockedByDefect
    ) {
      return this.prisma.pourClearance.update({
        where: { id: clearance.id },
        data: { isLockedByNCR, isLockedByMEP, isLockedByDefect },
      });
    }

    return clearance;
  }

  private lockMessage(clearance: PourClearance): string {
    if (clearance.isLockedByNCR) {
      return 'ZONE LOCKED: High-severity NCR is open.';
    }
    if (clearance.isLockedByMEP) {
      return 'Cannot clear pour. MEP Submittals (Sleeves/Embeds) are still pending.';
    }
    if (clearance.isLockedByDefect) {
      return 'ZONE LOCKED: High-Severity Site Defect Open. Fix defect to unlock pour clearance.';
    }
    return 'Pour clearance is locked.';
  }
}
