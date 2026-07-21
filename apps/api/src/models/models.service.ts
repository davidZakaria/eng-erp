import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModelStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { FileStorageService } from '../security-and-ops/services/file-storage.service';
import { ReviewModelSubmissionDto } from './dto/model-submission.dto';

@Injectable()
export class ModelsService {
  constructor(
    private prisma: PrismaService,
    private fileStorage: FileStorageService,
  ) {}

  async createSubmission(
    consultantId: string,
    projectId: string,
    title: string,
    file: Express.Multer.File,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const normalizedTitle = title.trim();
    const fileUrl = await this.fileStorage.uploadCadFile(
      file,
      projectId,
      normalizedTitle,
    );

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.modelSubmission.findMany({
        where: {
          projectId,
          title: normalizedTitle,
          deletedAt: null,
        },
        orderBy: { versionNumber: 'desc' },
      });

      const latestVersion = existing[0]?.versionNumber ?? 0;
      const nextVersion = latestVersion + 1;

      if (existing.length > 0) {
        await tx.modelSubmission.updateMany({
          where: {
            projectId,
            title: normalizedTitle,
            deletedAt: null,
            status: { not: ModelStatus.SUPERSEDED },
          },
          data: { status: ModelStatus.SUPERSEDED },
        });
      }

      return tx.modelSubmission.create({
        data: {
          projectId,
          consultantId,
          title: normalizedTitle,
          fileUrl,
          versionNumber: nextVersion,
          status: ModelStatus.PENDING_REVIEW,
          isLocked: false,
        },
        include: {
          project: true,
          consultant: { select: { id: true, fullName: true, email: true } },
        },
      });
    });
  }

  async reviewSubmission(
    submissionId: string,
    reviewerId: string,
    dto: ReviewModelSubmissionDto,
  ) {
    const allowedDecisions: ModelStatus[] = [
      ModelStatus.APPROVED_FOR_CONSTRUCTION,
      ModelStatus.REVISION_REQUESTED,
    ];

    if (!allowedDecisions.includes(dto.statusDecision)) {
      throw new BadRequestException(
        'statusDecision must be APPROVED_FOR_CONSTRUCTION or REVISION_REQUESTED',
      );
    }

    const submission = await this.prisma.modelSubmission.findFirst({
      where: { id: submissionId, deletedAt: null },
    });

    if (!submission) {
      throw new NotFoundException('Model submission not found');
    }

    if (submission.status !== ModelStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only PENDING_REVIEW models can be reviewed');
    }

    if (submission.isLocked) {
      throw new ForbiddenException('This model is locked and cannot be altered');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.modelReview.create({
        data: {
          modelSubmissionId: submissionId,
          reviewerId,
          statusDecision: dto.statusDecision,
          comments: dto.comments,
        },
      });

      const isApproved =
        dto.statusDecision === ModelStatus.APPROVED_FOR_CONSTRUCTION;

      return tx.modelSubmission.update({
        where: { id: submissionId },
        data: {
          status: dto.statusDecision,
          isLocked: isApproved,
        },
        include: {
          reviews: {
            orderBy: { createdAt: 'desc' },
            include: {
              reviewer: { select: { id: true, fullName: true } },
            },
          },
        },
      });
    });
  }

  async findAll(userId: string, role: Role) {
    if (role === Role.SITE_ENGINEER) {
      return this.prisma.modelSubmission.findMany({
        where: {
          deletedAt: null,
          status: ModelStatus.APPROVED_FOR_CONSTRUCTION,
          isLocked: true,
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (role === Role.CONSULTANT) {
      return this.prisma.modelSubmission.findMany({
        where: {
          consultantId: userId,
          deletedAt: null,
        },
        include: {
          project: { select: { id: true, name: true } },
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              reviewer: { select: { id: true, fullName: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (role === Role.HEAD_ENGINEER) {
      return this.prisma.modelSubmission.findMany({
        where: {
          deletedAt: null,
          status: ModelStatus.PENDING_REVIEW,
        },
        include: {
          project: { select: { id: true, name: true } },
          consultant: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    return this.prisma.modelSubmission.findMany({
      where: { deletedAt: null },
      include: {
        project: { select: { id: true, name: true } },
        consultant: { select: { id: true, fullName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findRevisionRequired(consultantId: string) {
    return this.prisma.modelSubmission.findMany({
      where: {
        consultantId,
        deletedAt: null,
        status: ModelStatus.REVISION_REQUESTED,
      },
      include: {
        project: { select: { id: true, name: true } },
        reviews: {
          where: { statusDecision: ModelStatus.REVISION_REQUESTED },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            reviewer: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSubmissionFile(submissionId: string, userId: string, role: Role) {
    const submission = await this.prisma.modelSubmission.findFirst({
      where: { id: submissionId, deletedAt: null },
    });

    if (!submission) {
      throw new NotFoundException('Model submission not found');
    }

    this.assertFileAccess(submission, userId, role);

    const file = await this.fileStorage.getFile(submission.fileUrl);
    const previewable = file.fileName.toLowerCase().endsWith('.pdf');

    return { ...file, previewable };
  }

  private assertFileAccess(
    submission: {
      consultantId: string;
      status: ModelStatus;
      isLocked: boolean;
    },
    userId: string,
    role: Role,
  ) {
    if (role === Role.CONSULTANT && submission.consultantId !== userId) {
      throw new ForbiddenException('You can only access your own submissions');
    }

    if (
      role === Role.SITE_ENGINEER &&
      (submission.status !== ModelStatus.APPROVED_FOR_CONSTRUCTION ||
        !submission.isLocked)
    ) {
      throw new ForbiddenException(
        'Site engineers can only access approved construction models',
      );
    }

    if (
      role !== Role.CONSULTANT &&
      role !== Role.SITE_ENGINEER &&
      role !== Role.HEAD_ENGINEER &&
      role !== Role.PROJECT_MANAGER
    ) {
      throw new ForbiddenException('Insufficient permissions to access this file');
    }
  }
}
