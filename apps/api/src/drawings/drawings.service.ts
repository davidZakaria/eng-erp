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

  async findAll(userId: string, role: Role) {
    if (role === Role.HEAD_ENGINEER || role === Role.PROJECT_MANAGER || role === Role.ADMIN) {
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

  async getDrawingFile(drawingId: string, userId: string, role: Role) {
    const drawing = await this.prisma.drawing.findUnique({
      where: { id: drawingId },
    });

    if (!drawing) {
      throw new NotFoundException('Drawing not found');
    }

    this.assertFileAccess(drawing, userId, role);

    const file = await this.fileStorage.getFile(drawing.fileUrl);
    const previewable = file.fileName.toLowerCase().endsWith('.pdf');

    return { ...file, previewable };
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
