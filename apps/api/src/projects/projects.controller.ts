import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { Roles } from '../common/decorators/roles.decorator';

const PROJECT_READERS = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.PROJECT_MANAGER,
  Role.HEAD_ENGINEER,
  Role.SITE_ENGINEER,
  Role.CONSULTANT,
  Role.ARCH_CONSULTANT,
  Role.STRUCT_CONSULTANT,
  Role.MEP_CONSULTANT,
] as const;

@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Roles(...PROJECT_READERS)
  @Get()
  findAll() {
    return this.projectsService.findAll();
  }
}
