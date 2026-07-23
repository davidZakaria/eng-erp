import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import {
  CreateCircuitDto,
  CreatePanelDto,
  CreateSpecSectionDto,
  CreateVendorDto,
  UpdateCircuitDto,
  UpdatePanelDto,
  UpdateSpecSectionDto,
  UpdateVendorDto,
} from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  findSpecSections(divisionCode?: string) {
    return this.prisma.specSection.findMany({
      where: {
        deletedAt: null,
        ...(divisionCode ? { divisionCode } : {}),
      },
      orderBy: [{ divisionCode: 'asc' }, { code: 'asc' }],
    });
  }

  findVendors(divisionCode?: string) {
    return this.prisma.approvedVendor.findMany({
      where: divisionCode
        ? { csiDivision: { code: divisionCode } }
        : undefined,
      orderBy: { name: 'asc' },
      include: {
        csiDivision: { select: { code: true, title: true } },
      },
    });
  }

  findDivisions() {
    return this.prisma.cSIDivision.findMany({
      orderBy: { code: 'asc' },
    });
  }

  findPanels() {
    return this.prisma.electricalPanel.findMany({
      include: { circuits: { orderBy: { circuitNumber: 'asc' } } },
      orderBy: { panelReference: 'asc' },
    });
  }

  async createSpecSection(dto: CreateSpecSectionDto) {
    const code = dto.code.trim();
    const existing = await this.prisma.specSection.findUnique({
      where: { code },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(`Spec section ${code} already exists`);
    }

    if (existing?.deletedAt) {
      return this.prisma.specSection.update({
        where: { id: existing.id },
        data: {
          title: dto.title.trim(),
          divisionCode: dto.divisionCode.trim(),
          fileUrl: dto.fileUrl?.trim() || null,
          deletedAt: null,
        },
      });
    }

    return this.prisma.specSection.create({
      data: {
        code,
        title: dto.title.trim(),
        divisionCode: dto.divisionCode.trim(),
        fileUrl: dto.fileUrl?.trim() || null,
      },
    });
  }

  async updateSpecSection(id: string, dto: UpdateSpecSectionDto) {
    const row = await this.prisma.specSection.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Spec section not found');

    return this.prisma.specSection.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.divisionCode ? { divisionCode: dto.divisionCode.trim() } : {}),
        ...(dto.fileUrl !== undefined
          ? { fileUrl: dto.fileUrl?.trim() || null }
          : {}),
      },
    });
  }

  async softDeleteSpecSection(id: string) {
    const row = await this.prisma.specSection.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Spec section not found');

    return this.prisma.specSection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async resolveDivisionId(divisionCode: string) {
    const division = await this.prisma.cSIDivision.findUnique({
      where: { code: divisionCode.trim() },
    });
    if (!division) {
      throw new NotFoundException(`CSI division ${divisionCode} not found`);
    }
    return division.id;
  }

  async createVendor(dto: CreateVendorDto) {
    const divisionId = await this.resolveDivisionId(dto.divisionCode);
    return this.prisma.approvedVendor.create({
      data: {
        name: dto.name.trim(),
        country: dto.country?.trim() || null,
        disciplineTag: dto.disciplineTag?.trim() || null,
        divisionId,
      },
      include: { csiDivision: { select: { code: true, title: true } } },
    });
  }

  async updateVendor(id: string, dto: UpdateVendorDto) {
    const row = await this.prisma.approvedVendor.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Vendor not found');

    const divisionId = dto.divisionCode
      ? await this.resolveDivisionId(dto.divisionCode)
      : undefined;

    return this.prisma.approvedVendor.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(divisionId ? { divisionId } : {}),
        ...(dto.country !== undefined
          ? { country: dto.country?.trim() || null }
          : {}),
        ...(dto.disciplineTag !== undefined
          ? { disciplineTag: dto.disciplineTag?.trim() || null }
          : {}),
      },
      include: { csiDivision: { select: { code: true, title: true } } },
    });
  }

  async deleteVendor(id: string) {
    const row = await this.prisma.approvedVendor.findUnique({
      where: { id },
      include: { submittals: { take: 1 } },
    });
    if (!row) throw new NotFoundException('Vendor not found');
    if (row.submittals.length > 0) {
      throw new ConflictException(
        'Cannot delete vendor linked to material submittals',
      );
    }
    await this.prisma.approvedVendor.delete({ where: { id } });
    return { deleted: true };
  }

  async createPanel(dto: CreatePanelDto) {
    const panelReference = dto.panelReference.trim();
    const existing = await this.prisma.electricalPanel.findUnique({
      where: { panelReference },
    });
    if (existing) {
      throw new ConflictException(`Panel ${panelReference} already exists`);
    }

    return this.prisma.electricalPanel.create({
      data: {
        panelReference,
        location: dto.location.trim(),
        incomingCB: dto.incomingCB.trim(),
      },
      include: { circuits: true },
    });
  }

  async updatePanel(id: string, dto: UpdatePanelDto) {
    const row = await this.prisma.electricalPanel.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Panel not found');

    if (dto.panelReference && dto.panelReference.trim() !== row.panelReference) {
      const clash = await this.prisma.electricalPanel.findUnique({
        where: { panelReference: dto.panelReference.trim() },
      });
      if (clash) {
        throw new ConflictException(`Panel ${dto.panelReference} already exists`);
      }
    }

    return this.prisma.electricalPanel.update({
      where: { id },
      data: {
        ...(dto.panelReference
          ? { panelReference: dto.panelReference.trim() }
          : {}),
        ...(dto.location ? { location: dto.location.trim() } : {}),
        ...(dto.incomingCB ? { incomingCB: dto.incomingCB.trim() } : {}),
      },
      include: { circuits: { orderBy: { circuitNumber: 'asc' } } },
    });
  }

  async deletePanel(id: string) {
    const row = await this.prisma.electricalPanel.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Panel not found');

    await this.prisma.$transaction([
      this.prisma.panelCircuit.deleteMany({ where: { panelId: id } }),
      this.prisma.electricalPanel.delete({ where: { id } }),
    ]);
    return { deleted: true };
  }

  async createCircuit(panelId: string, dto: CreateCircuitDto) {
    const panel = await this.prisma.electricalPanel.findUnique({
      where: { id: panelId },
    });
    if (!panel) throw new NotFoundException('Panel not found');

    return this.prisma.panelCircuit.create({
      data: {
        panelId,
        circuitNumber: dto.circuitNumber,
        mcbRating: dto.mcbRating,
        wireSize: dto.wireSize.trim(),
        loadType: dto.loadType.trim(),
        connectedLoadVA: dto.connectedLoadVA,
        demandFactor: dto.demandFactor,
        phase: dto.phase,
      },
    });
  }

  async updateCircuit(circuitId: string, dto: UpdateCircuitDto) {
    const row = await this.prisma.panelCircuit.findUnique({
      where: { id: circuitId },
    });
    if (!row) throw new NotFoundException('Circuit not found');

    return this.prisma.panelCircuit.update({
      where: { id: circuitId },
      data: {
        ...(dto.circuitNumber != null ? { circuitNumber: dto.circuitNumber } : {}),
        ...(dto.mcbRating != null ? { mcbRating: dto.mcbRating } : {}),
        ...(dto.wireSize ? { wireSize: dto.wireSize.trim() } : {}),
        ...(dto.loadType ? { loadType: dto.loadType.trim() } : {}),
        ...(dto.connectedLoadVA != null
          ? { connectedLoadVA: dto.connectedLoadVA }
          : {}),
        ...(dto.demandFactor != null ? { demandFactor: dto.demandFactor } : {}),
        ...(dto.phase ? { phase: dto.phase } : {}),
      },
    });
  }

  async deleteCircuit(circuitId: string) {
    const row = await this.prisma.panelCircuit.findUnique({
      where: { id: circuitId },
    });
    if (!row) throw new NotFoundException('Circuit not found');
    await this.prisma.panelCircuit.delete({ where: { id: circuitId } });
    return { deleted: true };
  }
}
