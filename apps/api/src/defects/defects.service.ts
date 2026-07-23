import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import {
  CreateSiteDefectDto,
  UpdateSiteDefectStatusDto,
} from './dto/create-site-defect.dto';

@Injectable()
export class DefectsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.siteDefect.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateSiteDefectDto) {
    const severity = dto.severity ?? 'HIGH';

    const defect = await this.prisma.siteDefect.create({
      data: {
        description: dto.description,
        location: dto.location,
        severity,
        status: 'OPEN',
      },
    });

    if (severity === 'HIGH') {
      await this.syncPourClearanceDefectLock(dto.location);
    }

    return defect;
  }

  async updateStatus(id: string, dto: UpdateSiteDefectStatusDto) {
    const defect = await this.prisma.siteDefect.findUnique({ where: { id } });

    if (!defect) {
      throw new NotFoundException('Site defect not found');
    }

    const updated = await this.prisma.siteDefect.update({
      where: { id },
      data: { status: dto.status },
    });

    if (defect.severity === 'HIGH') {
      await this.syncPourClearanceDefectLock(defect.location);
    }

    return updated;
  }

  private async syncPourClearanceDefectLock(location: string) {
    const openHighDefect = await this.prisma.siteDefect.findFirst({
      where: {
        location,
        severity: 'HIGH',
        status: 'OPEN',
      },
    });

    await this.prisma.pourClearance.updateMany({
      where: { zone: location },
      data: { isLockedByDefect: !!openHighDefect },
    });
  }
}
