import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Discipline, ItemStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { FileStorageService } from '../security-and-ops/services/file-storage.service';
import { isAllowedCadExtension } from './dto/upload-drawing.dto';
import { ReviewDrawingDto } from './dto/review-drawing.dto';
import {
  assertDrawingFileUrl,
  CreateDrawingAdminDto,
  UpdateDrawingAdminDto,
} from './dto/manage-drawing.dto';

const CONSULTANT_ROLES: Role[] = [
  Role.CONSULTANT,
  Role.ARCH_CONSULTANT,
  Role.STRUCT_CONSULTANT,
  Role.MEP_CONSULTANT,
];

@Injectable()
export class DrawingsService {
  constructor(
    private prisma: PrismaService,
    private fileStorage: FileStorageService,
  ) {}

  async uploadDrawing(
    uploaderId: string,
    drawingNumber: string,
    title: string,
    discipline: Discipline,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Drawing file is required');
    }

    if (!isAllowedCadExtension(file.originalname)) {
      throw new BadRequestException(
        'Allowed formats: .dwg (preferred), .dxf, .pdf',
      );
    }

    const normalizedNumber = drawingNumber.trim().toUpperCase();
    const fileUrl = await this.fileStorage.uploadCadFile(
      file,
      `drawings/${normalizedNumber}`,
      title,
    );

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.drawing.findMany({
        where: { drawingNumber: normalizedNumber },
        orderBy: { revision: 'desc' },
      });

      const latestRevision = existing[0]?.revision ?? -1;
      const nextRevision = latestRevision + 1;

      if (existing.length > 0) {
        await tx.drawing.updateMany({
          where: {
            drawingNumber: normalizedNumber,
            status: { not: ItemStatus.SUPERSEDED },
          },
          data: { status: ItemStatus.SUPERSEDED },
        });
      }

      return tx.drawing.create({
        data: {
          drawingNumber: normalizedNumber,
          title: title.trim(),
          discipline,
          revision: nextRevision,
          status: ItemStatus.PENDING_REVIEW,
          fileUrl,
          uploaderId,
        },
        include: {
          uploader: { select: { id: true, fullName: true, email: true } },
        },
      });
    });
  }

  async registerDrawingFromStorage(
    uploaderId: string,
    drawingNumber: string,
    title: string,
    discipline: Discipline,
    fileUrl: string,
    lod?: {
      projectNumber?: string;
      disciplineCode?: string;
      sheetNumber?: string;
      sheetSize?: string;
      scale?: string;
      packageName?: string;
    },
  ) {
    const fileName = fileUrl.split('/').pop() ?? '';
    if (!isAllowedCadExtension(fileName)) {
      throw new BadRequestException(
        'Allowed formats: .dwg (preferred), .dxf, .pdf',
      );
    }

    const normalizedNumber = drawingNumber.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.drawing.findMany({
        where: { drawingNumber: normalizedNumber },
        orderBy: { revision: 'desc' },
      });

      const latestRevision = existing[0]?.revision ?? -1;
      const nextRevision = latestRevision + 1;

      if (existing.length > 0) {
        await tx.drawing.updateMany({
          where: {
            drawingNumber: normalizedNumber,
            status: { not: ItemStatus.SUPERSEDED },
          },
          data: { status: ItemStatus.SUPERSEDED },
        });
      }

      return tx.drawing.create({
        data: {
          drawingNumber: normalizedNumber,
          title: title.trim(),
          discipline,
          revision: nextRevision,
          status: ItemStatus.PENDING_REVIEW,
          fileUrl,
          uploaderId,
          projectNumber: lod?.projectNumber?.trim() || null,
          disciplineCode: lod?.disciplineCode?.trim() || null,
          sheetNumber: lod?.sheetNumber?.trim() || null,
          sheetSize: lod?.sheetSize?.trim() || null,
          scale: lod?.scale?.trim() || null,
          packageName: lod?.packageName?.trim() || null,
        },
        include: {
          uploader: { select: { id: true, fullName: true, email: true } },
        },
      });
    });
  }

  async findAll(userId: string, role: Role) {
    if (
      role === Role.HEAD_ENGINEER ||
      role === Role.PROJECT_MANAGER ||
      role === Role.ADMIN ||
      role === Role.SUPER_ADMIN
    ) {
      return this.prisma.drawing.findMany({
        orderBy: [{ drawingNumber: 'asc' }, { revision: 'desc' }],
        include: {
          uploader: { select: { id: true, fullName: true, email: true } },
        },
      });
    }

    if (CONSULTANT_ROLES.includes(role)) {
      return this.prisma.drawing.findMany({
        where: { uploaderId: userId },
        orderBy: [{ drawingNumber: 'asc' }, { revision: 'desc' }],
        include: {
          uploader: { select: { id: true, fullName: true, email: true } },
        },
      });
    }

    return this.prisma.drawing.findMany({
      where: { status: ItemStatus.APPROVED_FOR_CONSTRUCTION },
      orderBy: [{ drawingNumber: 'asc' }, { revision: 'desc' }],
      include: {
        uploader: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findPendingForReview() {
    return this.prisma.drawing.findMany({
      where: { status: ItemStatus.PENDING_REVIEW },
      orderBy: { createdAt: 'asc' },
      include: {
        uploader: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async createDrawingAdmin(uploaderId: string, dto: CreateDrawingAdminDto) {
    try {
      assertDrawingFileUrl(dto.fileUrl);
    } catch {
      throw new BadRequestException(
        'Allowed formats: .dwg (preferred), .dxf, .pdf',
      );
    }

    const drawingNumber = dto.drawingNumber.trim().toUpperCase();

    return this.prisma.drawing.create({
      data: {
        drawingNumber,
        title: dto.title.trim(),
        discipline: dto.discipline,
        revision: dto.revision,
        status: dto.status,
        fileUrl: dto.fileUrl.trim(),
        uploaderId,
        projectNumber: dto.projectNumber?.trim() || null,
        disciplineCode: dto.disciplineCode?.trim() || null,
        sheetNumber: dto.sheetNumber?.trim() || null,
        sheetSize: dto.sheetSize?.trim() || null,
        scale: dto.scale?.trim() || null,
        packageName: dto.packageName?.trim() || null,
      },
      include: {
        uploader: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async updateDrawingAdmin(id: string, dto: UpdateDrawingAdminDto) {
    const existing = await this.prisma.drawing.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Drawing not found');
    }

    if (dto.fileUrl) {
      try {
        assertDrawingFileUrl(dto.fileUrl);
      } catch {
        throw new BadRequestException(
          'Allowed formats: .dwg (preferred), .dxf, .pdf',
        );
      }
    }

    const drawingNumber = dto.drawingNumber
      ? dto.drawingNumber.trim().toUpperCase()
      : undefined;
    const revision = dto.revision;

    if (drawingNumber !== undefined || revision !== undefined) {
      const nextNumber = drawingNumber ?? existing.drawingNumber;
      const nextRevision = revision ?? existing.revision;
      const conflict = await this.prisma.drawing.findFirst({
        where: {
          drawingNumber: nextNumber,
          revision: nextRevision,
          NOT: { id },
        },
      });
      if (conflict) {
        throw new BadRequestException(
          'A drawing with this number and revision already exists',
        );
      }
    }

    return this.prisma.drawing.update({
      where: { id },
      data: {
        drawingNumber,
        title: dto.title?.trim(),
        discipline: dto.discipline,
        revision: dto.revision,
        status: dto.status,
        fileUrl: dto.fileUrl?.trim(),
        projectNumber:
          dto.projectNumber !== undefined
            ? dto.projectNumber.trim() || null
            : undefined,
        disciplineCode:
          dto.disciplineCode !== undefined
            ? dto.disciplineCode.trim() || null
            : undefined,
        sheetNumber:
          dto.sheetNumber !== undefined
            ? dto.sheetNumber.trim() || null
            : undefined,
        sheetSize:
          dto.sheetSize !== undefined ? dto.sheetSize.trim() || null : undefined,
        scale: dto.scale !== undefined ? dto.scale.trim() || null : undefined,
        packageName:
          dto.packageName !== undefined
            ? dto.packageName.trim() || null
            : undefined,
      },
      include: {
        uploader: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async softDeleteDrawing(id: string) {
    const existing = await this.prisma.drawing.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Drawing not found');
    }

    return this.prisma.drawing.update({
      where: { id },
      data: { status: ItemStatus.SUPERSEDED },
      include: {
        uploader: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async reviewDrawing(drawingId: string, dto: ReviewDrawingDto) {
    const allowed: ItemStatus[] = [
      ItemStatus.APPROVED_FOR_CONSTRUCTION,
      ItemStatus.REVISION_REQUESTED,
    ];

    if (!allowed.includes(dto.statusDecision)) {
      throw new BadRequestException(
        'statusDecision must be APPROVED_FOR_CONSTRUCTION or REVISION_REQUESTED',
      );
    }

    const drawing = await this.prisma.drawing.findUnique({
      where: { id: drawingId },
    });

    if (!drawing) {
      throw new NotFoundException('Drawing not found');
    }

    if (drawing.status !== ItemStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only PENDING_REVIEW drawings can be reviewed');
    }

    return this.prisma.drawing.update({
      where: { id: drawingId },
      data: { status: dto.statusDecision },
      include: {
        uploader: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async getDrawingFile(
    drawingId: string,
    userId: string,
    role: Role,
    rangeHeader?: string,
  ) {
    const drawing = await this.prisma.drawing.findUnique({
      where: { id: drawingId },
    });

    if (!drawing) {
      throw new NotFoundException('Drawing not found');
    }

    this.assertFileAccess(drawing, userId, role);

    const meta = await this.fileStorage.statFile(drawing.fileUrl);
    const previewable = meta.fileName.toLowerCase().endsWith('.pdf');
    const byteRange = rangeHeader
      ? parseByteRange(rangeHeader, meta.size)
      : undefined;

    if (byteRange) {
      const buffer = await this.fileStorage.getFilePart(
        drawing.fileUrl,
        byteRange.start,
        byteRange.end,
      );
      return {
        buffer,
        contentType: meta.contentType,
        fileName: meta.fileName,
        previewable,
        size: meta.size,
        start: byteRange.start,
        end: byteRange.end,
        partial: true,
      };
    }

    const buffer = await this.fileStorage.getFilePart(
      drawing.fileUrl,
      0,
      meta.size > 0 ? meta.size - 1 : 0,
    );

    return {
      buffer,
      contentType: meta.contentType,
      fileName: meta.fileName,
      previewable,
      size: meta.size,
      start: 0,
      end: meta.size > 0 ? meta.size - 1 : 0,
      partial: false,
    };
  }

  private assertFileAccess(
    drawing: { uploaderId: string; status: ItemStatus },
    userId: string,
    role: Role,
  ) {
    if (CONSULTANT_ROLES.includes(role) && drawing.uploaderId !== userId) {
      throw new ForbiddenException('You can only access your own drawings');
    }

    if (
      role === Role.SITE_ENGINEER &&
      drawing.status !== ItemStatus.APPROVED_FOR_CONSTRUCTION
    ) {
      throw new ForbiddenException(
        'Site engineers can only access approved construction drawings',
      );
    }
  }
}

function parseByteRange(
  rangeHeader: string,
  size: number,
): { start: number; end: number } | undefined {
  const match = /^bytes=(\d+)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match || size <= 0) {
    return undefined;
  }

  const start = Number.parseInt(match[1], 10);
  const end = match[2]
    ? Number.parseInt(match[2], 10)
    : size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    return undefined;
  }

  return { start, end: Math.min(end, size - 1) };
}
