import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Roles(Role.HEAD_ENGINEER, Role.PROJECT_MANAGER)
  @Get('variance')
  getVarianceReport() {
    return this.reportsService.getVarianceReport();
  }
}
