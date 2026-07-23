import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { PourTrackerService } from './pour-tracker.service';
import {
  CreatePourTrackerEntryDto,
  UpdatePourTrackerEntryDto,
} from './dto/pour-tracker.dto';

@Controller('pour-tracker')
export class PourTrackerController {
  constructor(private pourTrackerService: PourTrackerService) {}

  @Roles(
    Role.HEAD_ENGINEER,
    Role.SITE_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  )
  @Get()
  findAll() {
    return this.pourTrackerService.findAll();
  }

  @Roles(Role.SITE_ENGINEER, Role.HEAD_ENGINEER, Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePourTrackerEntryDto,
  ) {
    return this.pourTrackerService.create(user.sub, dto);
  }

  @Roles(Role.HEAD_ENGINEER, Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePourTrackerEntryDto) {
    return this.pourTrackerService.update(id, dto);
  }

  @Roles(Role.HEAD_ENGINEER, Role.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pourTrackerService.softDelete(id);
  }

  @Roles(Role.HEAD_ENGINEER, Role.SUPER_ADMIN)
  @Post('import/seed')
  importSeed() {
    return this.pourTrackerService.importFromSeed();
  }
}
