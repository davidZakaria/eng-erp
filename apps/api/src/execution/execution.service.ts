import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModelStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateExecutionLogDto } from './dto/create-execution-log.dto';

@Injectable()
export class ExecutionService {
  constructor(private prisma: PrismaService) {}

  async create(siteEngineerId: string, dto: CreateExecutionLogDto) {
    const component = await this.prisma.buildingComponent.findFirst({
      where: { id: dto.buildingComponentId, deletedAt: null },
    });

    if (!component) {
      throw new NotFoundException('Building component not found');
    }

    if (dto.modelSubmissionId) {
      const model = await this.prisma.modelSubmission.findFirst({
        where: { id: dto.modelSubmissionId, deletedAt: null },
      });

      if (!model) {
        throw new NotFoundException('Model submission not found');
      }

      if (
        model.status !== ModelStatus.APPROVED_FOR_CONSTRUCTION ||
        !model.isLocked
      ) {
        throw new BadRequestException(
          'Execution can only reference APPROVED_FOR_CONSTRUCTION locked models',
        );
      }
    }

    return this.prisma.executionLog.create({
      data: {
        buildingComponentId: dto.buildingComponentId,
        siteEngineerId,
        modelSubmissionId: dto.modelSubmissionId,
        actualConcreteM3: dto.actualConcreteM3,
        actualRebarByDiameter: dto.actualRebarByDiameter,
        actualPourDate: new Date(dto.actualPourDate),
        notes: dto.notes,
      },
      include: {
        buildingComponent: true,
        modelSubmission: true,
      },
    });
  }
}
