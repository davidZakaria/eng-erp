import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { StorageService } from './storage.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CompleteMultipartDto } from './dto/complete-multipart.dto';
import { CreateMultipartDto } from './dto/create-multipart.dto';
import { AbortMultipartDto } from './dto/abort-multipart.dto';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Roles(
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
  )
  @Get('upload-url')
  getUploadUrl(
    @Query('fileName') fileName?: string,
    @Query('contentType') contentType?: string,
  ) {
    if (!fileName?.trim() || !contentType?.trim()) {
      throw new BadRequestException('fileName and contentType are required');
    }

    return this.storageService.generateUploadUrl(
      fileName.trim(),
      contentType.trim(),
    );
  }

  @Roles(
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
  )
  @Post('multipart/create')
  createMultipart(@Body() dto: CreateMultipartDto) {
    return this.storageService.createMultipartUpload(
      dto.fileName,
      dto.contentType,
    );
  }

  @Roles(
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
  )
  @Get('multipart/sign-part')
  signPart(
    @Query('key') key?: string,
    @Query('uploadId') uploadId?: string,
    @Query('partNumber') partNumber?: string,
  ) {
    if (!key || !uploadId || !partNumber) {
      throw new BadRequestException('key, uploadId, and partNumber are required');
    }

    return this.storageService.signPartUpload(
      key,
      uploadId,
      Number(partNumber),
    );
  }

  @Roles(
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
  )
  @SkipThrottle()
  @Put('multipart/upload-part')
  async uploadPart(
    @Query('key') key: string | undefined,
    @Query('uploadId') uploadId: string | undefined,
    @Query('partNumber') partNumber: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!key || !uploadId || !partNumber) {
      throw new BadRequestException('key, uploadId, and partNumber are required');
    }

    const partNum = Number(partNumber);
    if (!Number.isInteger(partNum) || partNum < 1) {
      throw new BadRequestException('partNumber must be a positive integer');
    }

    let body: Buffer;
    if (Buffer.isBuffer(req.body)) {
      body = req.body;
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    }

    if (body.length === 0) {
      throw new BadRequestException('Request body is empty');
    }

    try {
      const { ETag } = await this.storageService.uploadPartBody(
        key,
        uploadId,
        partNum,
        body,
      );

      res.setHeader('ETag', ETag);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Upload part failed';
      throw new BadRequestException(message);
    }
  }

  @Roles(
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
  )
  @Get('multipart/list-parts')
  listParts(
    @Query('key') key?: string,
    @Query('uploadId') uploadId?: string,
  ) {
    if (!key || !uploadId) {
      throw new BadRequestException('key and uploadId are required');
    }

    return this.storageService.listMultipartParts(key, uploadId);
  }

  @Roles(
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
  )
  @SkipThrottle()
  @Post('multipart/complete')
  completeMultipart(@Body() dto: CompleteMultipartDto) {
    return this.storageService.completeMultipartUpload(
      dto.key,
      dto.uploadId,
      dto.parts,
    );
  }

  @Roles(
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
  )
  @Post('multipart/abort')
  abortMultipart(@Body() dto: AbortMultipartDto) {
    return this.storageService.abortMultipartUpload(dto.key, dto.uploadId);
  }
}
