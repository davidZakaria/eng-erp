import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  @Roles(
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  )
  @Get('plans')
  findPlans() {
    return this.scheduleService.findPlans();
  }

  @Roles(
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  )
  @Get('plans/:id')
  findPlan(@Param('id') id: string) {
    return this.scheduleService.findPlanWithLines(id);
  }

  @Roles(Role.HEAD_ENGINEER, Role.PROJECT_MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  @Patch('progress/:id')
  updateProgress(
    @Param('id') id: string,
    @Body()
    body: {
      quantity?: number;
      rateEGP?: number;
      durationDays?: number;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
  ) {
    return this.scheduleService.updateProgress(id, body);
  }

  @Roles(Role.HEAD_ENGINEER, Role.SUPER_ADMIN)
  @Post('import/seed')
  importSeed() {
    return this.scheduleService.importFromSeed();
  }
}
