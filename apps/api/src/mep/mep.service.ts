import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemStatus, PanelPhase } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateMaterialSubmittalDto } from './dto/create-material-submittal.dto';
import { ReviewMaterialSubmittalDto } from './dto/review-material-submittal.dto';

const SUBMITTAL_INCLUDE = {
  csiDivision: true,
  vendor: true,
  specSection: { select: { code: true, title: true, divisionCode: true } },
} as const;

const REVIEWABLE_STATUSES: ItemStatus[] = [
  ItemStatus.PENDING_REVIEW,
  ItemStatus.DEVIATION_PENDING_OWNER,
];

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

    if (dto.specSectionId) {
      const specSection = await this.prisma.specSection.findFirst({
        where: { id: dto.specSectionId, deletedAt: null },
      });
      if (!specSection) {
        throw new NotFoundException('Spec section not found');
      }
    }

    if (dto.vendorId) {
      const vendor = await this.prisma.approvedVendor.findUnique({
        where: { id: dto.vendorId },
      });
      if (!vendor || vendor.divisionId !== division.id) {
        throw new BadRequestException('Vendor is not valid for this division');
      }
    }

    let status: ItemStatus = ItemStatus.PENDING_REVIEW;
    let systemRecommendation: string | null = null;

    if (!dto.isApprovedVendor) {
      if (!dto.equivalenceLetterUrl?.trim()) {
        throw new BadRequestException(
          'equivalenceLetterUrl is required for unlisted vendors',
        );
      }
      status = ItemStatus.DEVIATION_PENDING_OWNER;
      systemRecommendation = this.computeSystemRecommendation(
        dto.leadTimeWeeks,
        dto.costDeltaEGP,
      );
    }

    return this.prisma.materialSubmittal.create({
      data: {
        equipmentTag: dto.equipmentTag,
        proposedVendor: dto.proposedVendor,
        isApprovedVendor: dto.isApprovedVendor,
        equivalenceLetterUrl: dto.equivalenceLetterUrl,
        leadTimeWeeks: dto.leadTimeWeeks,
        costDeltaEGP: dto.costDeltaEGP,
        systemRecommendation,
        status,
        divisionId: dto.divisionId,
        vendorId: dto.vendorId,
        specSectionId: dto.specSectionId,
      },
      include: SUBMITTAL_INCLUDE,
    });
  }

  findAllSubmittals() {
    return this.prisma.materialSubmittal.findMany({
      orderBy: { equipmentTag: 'asc' },
      include: SUBMITTAL_INCLUDE,
    });
  }

  async reviewSubmittal(id: string, dto: ReviewMaterialSubmittalDto) {
    const submittal = await this.prisma.materialSubmittal.findUnique({
      where: { id },
    });

    if (!submittal) {
      throw new NotFoundException('Submittal not found');
    }

    if (!REVIEWABLE_STATUSES.includes(submittal.status)) {
      throw new BadRequestException('Submittal is not pending review');
    }

    return this.prisma.materialSubmittal.update({
      where: { id },
      data: { status: dto.statusDecision },
      include: SUBMITTAL_INCLUDE,
    });
  }

  private computeSystemRecommendation(
    leadTimeWeeks?: number,
    costDeltaEGP?: number,
  ): string | null {
    if (leadTimeWeeks == null || costDeltaEGP == null) {
      return null;
    }

    if (leadTimeWeeks < 4 && costDeltaEGP < 0) {
      return '✅ Owner Override Advised: Saves schedule and reduces cost.';
    }

    if (costDeltaEGP > 0) {
      return '⚠️ High Risk: Increases budget. Evaluate standard vendors.';
    }

    return null;
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
