import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemStatus, PanelPhase } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateMaterialSubmittalDto } from './dto/create-material-submittal.dto';

export interface PanelLoadResult {
  panelId: string;
  panelReference: string;
  phaseLoads: { R: number; Y: number; B: number };
  averageLoad: number;
  maxLoad: number;
  isUnbalanced: boolean;
}

@Injectable()
export class MepService {
  constructor(private prisma: PrismaService) {}

  async createSubmittal(dto: CreateMaterialSubmittalDto) {
    const division = await this.prisma.cSIDivision.findUnique({
      where: { id: dto.divisionId },
    });

    if (!division) {
      throw new NotFoundException('CSI Division not found');
    }

    let status: ItemStatus = ItemStatus.PENDING_REVIEW;

    if (!dto.isApprovedVendor) {
      if (!dto.equivalenceLetterUrl?.trim()) {
        throw new BadRequestException(
          'equivalenceLetterUrl is required for unlisted vendors',
        );
      }
      status = ItemStatus.DEVIATION_PENDING_OWNER;
    }

    return this.prisma.materialSubmittal.create({
      data: {
        equipmentTag: dto.equipmentTag,
        proposedVendor: dto.proposedVendor,
        isApprovedVendor: dto.isApprovedVendor,
        equivalenceLetterUrl: dto.equivalenceLetterUrl,
        status,
        divisionId: dto.divisionId,
        vendorId: dto.vendorId,
      },
      include: {
        csiDivision: true,
        vendor: true,
      },
    });
  }

  findAllSubmittals() {
    return this.prisma.materialSubmittal.findMany({
      orderBy: { equipmentTag: 'asc' },
      include: {
        csiDivision: true,
        vendor: true,
      },
    });
  }

  async calculatePanelLoad(panelId: string): Promise<PanelLoadResult> {
    const panel = await this.prisma.electricalPanel.findUnique({
      where: { id: panelId },
      include: { circuits: true },
    });

    if (!panel) {
      throw new NotFoundException('Electrical panel not found');
    }

    const phaseLoads = { R: 0, Y: 0, B: 0 };

    for (const circuit of panel.circuits) {
      const demand = circuit.connectedLoadVA * circuit.demandFactor;
      if (circuit.phase === PanelPhase.R) phaseLoads.R += demand;
      if (circuit.phase === PanelPhase.Y) phaseLoads.Y += demand;
      if (circuit.phase === PanelPhase.B) phaseLoads.B += demand;
    }

    const averageLoad = (phaseLoads.R + phaseLoads.Y + phaseLoads.B) / 3;
    const maxLoad = Math.max(phaseLoads.R, phaseLoads.Y, phaseLoads.B);

    let isUnbalanced = false;
    if (averageLoad > 0) {
      isUnbalanced = (maxLoad - averageLoad) / averageLoad > 0.15;
    }

    await this.prisma.electricalPanel.update({
      where: { id: panelId },
      data: { isUnbalanced },
    });

    return {
      panelId: panel.id,
      panelReference: panel.panelReference,
      phaseLoads,
      averageLoad,
      maxLoad,
      isUnbalanced,
    };
  }

  findAllPanels() {
    return this.prisma.electricalPanel.findMany({
      include: { circuits: true },
      orderBy: { panelReference: 'asc' },
    });
  }
}
