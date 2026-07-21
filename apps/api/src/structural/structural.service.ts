import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { UpdatePourChecklistDto } from './dto/update-pour-checklist.dto';

@Injectable()
export class StructuralService {
  constructor(private prisma: PrismaService) {}

  findAllPourClearances() {
    return this.prisma.pourClearance.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  findPourClearance(id: string) {
    return this.prisma.pourClearance.findUnique({ where: { id } });
  }

  async updateChecklist(id: string, dto: UpdatePourChecklistDto) {
    const existing = await this.prisma.pourClearance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Pour clearance record not found');
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
    const clearance = await this.prisma.pourClearance.findUnique({
      where: { id },
    });

    if (!clearance) {
      throw new NotFoundException('Pour clearance record not found');
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
}
