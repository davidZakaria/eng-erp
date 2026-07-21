import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { CreateBoqDto } from './dto/create-boq.dto';

@Injectable()
export class BoqService {
  constructor(private prisma: PrismaService) {}

  async create(createdById: string, dto: CreateBoqDto) {
    const component = await this.prisma.buildingComponent.findFirst({
      where: { id: dto.buildingComponentId, deletedAt: null },
    });

    if (!component) {
      throw new NotFoundException('Building component not found');
    }

    const existing = await this.prisma.componentBOQ.findFirst({
      where: { buildingComponentId: dto.buildingComponentId, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(
        'BOQ already exists for this component. Use soft-delete workflow before redefining.',
      );
    }

    return this.prisma.componentBOQ.create({
      data: {
        buildingComponentId: dto.buildingComponentId,
        plannedConcreteM3: dto.plannedConcreteM3,
        plannedRebarByDiameter: dto.plannedRebarByDiameter,
        plannedStartDate: new Date(dto.plannedStartDate),
        plannedEndDate: new Date(dto.plannedEndDate),
        createdById,
      },
      include: {
        buildingComponent: {
          include: { building: { include: { project: true } } },
        },
      },
    });
  }
}
