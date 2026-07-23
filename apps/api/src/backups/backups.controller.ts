import { Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { BackupsService } from './backups.service';

@Controller('backups')
@Roles(Role.SUPER_ADMIN)
export class BackupsController {
  constructor(private backupsService: BackupsService) {}

  @Get()
  findAll() {
    return this.backupsService.findAll();
  }

  @Post('trigger')
  trigger() {
    return this.backupsService.triggerManual();
  }

  @Get(':id/download')
  download(@Param('id') id: string) {
    return this.backupsService.getDownloadUrl(id);
  }
}
