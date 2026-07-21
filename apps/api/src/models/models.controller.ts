import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { ModelsService } from './models.service';
import { CreateModelSubmissionDto, ReviewModelSubmissionDto } from './dto/model-submission.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('models')
export class ModelsController {
  constructor(private modelsService: ModelsService) {}

  @Roles(Role.CONSULTANT)
  @Post('submissions')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  createSubmission(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateModelSubmissionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('CAD/PDF file is required');
    }
    return this.modelsService.createSubmission(
      user.sub,
      dto.projectId,
      dto.title,
      file,
    );
  }

  @Get('submissions')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.modelsService.findAll(user.sub, user.role);
  }

  @Roles(Role.CONSULTANT)
  @Get('submissions/revisions-required')
  findRevisionsRequired(@CurrentUser() user: JwtPayload) {
    return this.modelsService.findRevisionRequired(user.sub);
  }

  @Get('submissions/:id/file')
  async getSubmissionFile(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const file = await this.modelsService.getSubmissionFile(
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

  @Roles(Role.HEAD_ENGINEER)
  @Post('submissions/:id/review')
  reviewSubmission(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReviewModelSubmissionDto,
  ) {
    return this.modelsService.reviewSubmission(id, user.sub, dto);
  }
}
