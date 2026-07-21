import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
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
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }),
  )
  uploadDrawing(
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
        user.role === Role.ADMIN)
    ) {
      return this.drawingsService.findPendingForReview();
    }
    return this.drawingsService.findAll(user.sub, user.role);
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

  @Roles(Role.HEAD_ENGINEER, Role.PROJECT_MANAGER, Role.ADMIN)
  @Post(':id/review')
  reviewDrawing(@Param('id') id: string, @Body() dto: ReviewDrawingDto) {
    return this.drawingsService.reviewDrawing(id, dto);
  }
}
