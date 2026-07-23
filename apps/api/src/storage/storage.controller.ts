import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
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
