import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { CreateBoqDto } from './dto/create-boq.dto';
import { ExecuteQuantityDto } from './dto/execute-quantity.dto';
import {
  CreateBoqItemDto,
  UpdateBoqItemDto,
} from './dto/manage-boq-item.dto';

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

  findAllItems() {
    return this.prisma.bOQItem.findMany({
      orderBy: { itemCode: 'asc' },
    });
  }

  async executeQuantity(dto: ExecuteQuantityDto) {
    const item = await this.prisma.bOQItem.findUnique({
      where: { id: dto.boqItemId },
    });

    if (!item) {
      throw new NotFoundException('BOQ item not found');
    }

    if (item.actualQuantity + dto.installedQuantity > item.plannedQuantity) {
      throw new ForbiddenException('BUDGET EXCEEDED: VO Required.');
    }

    return this.prisma.bOQItem.update({
      where: { id: dto.boqItemId },
      data: {
        actualQuantity: item.actualQuantity + dto.installedQuantity,
      },
    });
  }

  createItem(dto: CreateBoqItemDto) {
    return this.prisma.bOQItem.create({
      data: {
        itemCode: dto.itemCode.trim(),
        description: dto.description.trim(),
        unit: dto.unit.trim(),
        plannedQuantity: dto.plannedQuantity,
        rateEGP: dto.rateEGP,
        divisionCode: dto.divisionCode?.trim() || null,
        actualQuantity: 0,
      },
    });
  }

  async updateItem(id: string, dto: UpdateBoqItemDto) {
    const item = await this.prisma.bOQItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('BOQ item not found');

    return this.prisma.bOQItem.update({
      where: { id },
      data: {
        ...(dto.itemCode ? { itemCode: dto.itemCode.trim() } : {}),
        ...(dto.description ? { description: dto.description.trim() } : {}),
        ...(dto.unit ? { unit: dto.unit.trim() } : {}),
        ...(dto.plannedQuantity != null
          ? { plannedQuantity: dto.plannedQuantity }
          : {}),
        ...(dto.rateEGP != null ? { rateEGP: dto.rateEGP } : {}),
        ...(dto.actualQuantity != null
          ? { actualQuantity: dto.actualQuantity }
          : {}),
        ...(dto.divisionCode !== undefined
          ? { divisionCode: dto.divisionCode?.trim() || null }
          : {}),
      },
    });
  }

  async deleteItem(id: string) {
    const item = await this.prisma.bOQItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('BOQ item not found');
    await this.prisma.bOQItem.delete({ where: { id } });
    return { deleted: true };
  }
}
