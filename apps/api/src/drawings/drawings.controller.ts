import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { DrawingsService } from './drawings.service';
import { UploadDrawingDto } from './dto/upload-drawing.dto';
import { ReviewDrawingDto } from './dto/review-drawing.dto';
import {
  CreateDrawingAdminDto,
  UpdateDrawingAdminDto,
} from './dto/manage-drawing.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('drawings')
export class DrawingsController {
  constructor(private drawingsService: DrawingsService) {}

  @Roles(
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
  )
  @Post()
  registerDrawing(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadDrawingDto,
  ) {
    if (!dto.fileUrl?.trim()) {
      throw new BadRequestException(
        'fileUrl from pre-signed upload is required. Use POST /drawings/multipart for direct server upload.',
      );
    }

    return this.drawingsService.registerDrawingFromStorage(
      user.sub,
      dto.drawingNumber,
      dto.title,
      dto.discipline,
      dto.fileUrl.trim(),
      {
        projectNumber: dto.projectNumber,
        disciplineCode: dto.disciplineCode,
        sheetNumber: dto.sheetNumber,
        sheetSize: dto.sheetSize,
        scale: dto.scale,
        packageName: dto.packageName,
      },
    );
  }

  @Roles(
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
  )
  @Post('multipart')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }),
  )
  uploadDrawingMultipart(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadDrawingDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Drawing file is required');
    }

    return this.drawingsService.uploadDrawing(
      user.sub,
      dto.drawingNumber,
      dto.title,
      dto.discipline,
      file,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('pending') pending?: string,
  ) {
    if (
      pending === 'true' &&
      (user.role === Role.HEAD_ENGINEER ||
        user.role === Role.PROJECT_MANAGER ||
        user.role === Role.ADMIN ||
        user.role === Role.SUPER_ADMIN)
    ) {
      return this.drawingsService.findPendingForReview();
    }
    return this.drawingsService.findAll(user.sub, user.role);
  }

  @Roles(Role.SUPER_ADMIN, Role.HEAD_ENGINEER)
  @Post('manage')
  createDrawingAdmin(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDrawingAdminDto,
  ) {
    return this.drawingsService.createDrawingAdmin(user.sub, dto);
  }

  @Get(':id/file')
  async getDrawingFile(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const file = await this.drawingsService.getDrawingFile(
      id,
      user.sub,
      user.role,
    );
    const disposition = file.previewable ? 'inline' : 'attachment';
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${file.fileName}"`,
    );
    res.send(file.buffer);
  }

  @Roles(
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  )
  @Post(':id/review')
  reviewDrawing(@Param('id') id: string, @Body() dto: ReviewDrawingDto) {
    return this.drawingsService.reviewDrawing(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.HEAD_ENGINEER)
  @Patch(':id')
  updateDrawingAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateDrawingAdminDto,
  ) {
    return this.drawingsService.updateDrawingAdmin(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.HEAD_ENGINEER)
  @Delete(':id')
  softDeleteDrawing(@Param('id') id: string) {
    return this.drawingsService.softDeleteDrawing(id);
  }
}
