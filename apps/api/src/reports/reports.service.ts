import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

export interface VarianceReportRow {
  componentId: string;
  componentName: string;
  buildingName: string;
  projectName: string;
  plannedConcreteM3: number;
  actualConcreteM3: number;
  plannedEndDate: string;
  actualEndDate: string | null;
  isOverBudget: boolean;
  isDelayed: boolean;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getVarianceReport(): Promise<VarianceReportRow[]> {
    const boqs = await this.prisma.componentBOQ.findMany({
      where: { deletedAt: null },
      include: {
        buildingComponent: {
          include: {
            building: { include: { project: true } },
            executionLogs: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return boqs.map((boq) => {
      const logs = boq.buildingComponent.executionLogs;
      const actualConcreteM3 = logs.reduce(
        (sum, log) => sum + log.actualConcreteM3,
        0,
      );

      const actualEndDate =
        logs.length > 0
          ? logs.reduce(
              (max, log) =>
                log.actualPourDate > max ? log.actualPourDate : max,
              logs[0].actualPourDate,
            )
          : null;

      const isOverBudget = actualConcreteM3 > boq.plannedConcreteM3;
      const isDelayed =
        actualEndDate !== null && actualEndDate > boq.plannedEndDate;

      return {
        componentId: boq.buildingComponentId,
        componentName: boq.buildingComponent.name,
        buildingName: boq.buildingComponent.building.name,
        projectName: boq.buildingComponent.building.project.name,
        plannedConcreteM3: boq.plannedConcreteM3,
        actualConcreteM3,
        plannedEndDate: boq.plannedEndDate.toISOString(),
        actualEndDate: actualEndDate?.toISOString() ?? null,
        isOverBudget,
        isDelayed,
      };
    });
  }
}
