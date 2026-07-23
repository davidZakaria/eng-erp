import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DefectsService } from './defects.service';
import {
  CreateSiteDefectDto,
  UpdateSiteDefectStatusDto,
} from './dto/create-site-defect.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('defects')
export class DefectsController {
  constructor(private defectsService: DefectsService) {}

  @Roles(
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.SITE_ENGINEER,
    Role.ADMIN,
  )
  @Get()
  findAll() {
    return this.defectsService.findAll();
  }

  @Roles(Role.SITE_ENGINEER, Role.HEAD_ENGINEER, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateSiteDefectDto) {
    return this.defectsService.create(dto);
  }

  @Roles(Role.HEAD_ENGINEER, Role.SITE_ENGINEER, Role.ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSiteDefectStatusDto) {
    return this.defectsService.updateStatus(id, dto);
  }
}
