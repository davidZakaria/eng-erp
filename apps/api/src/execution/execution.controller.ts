import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ExecutionService } from './execution.service';
import { CreateExecutionLogDto } from './dto/create-execution-log.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('execution-logs')
export class ExecutionController {
  constructor(private executionService: ExecutionService) {}

  @Roles(
    Role.SITE_ENGINEER,
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.ADMIN,
  )
  @Get()
  findAll() {
    return this.executionService.findAll();
  }

  @Roles(Role.SITE_ENGINEER)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateExecutionLogDto) {
    return this.executionService.create(user.sub, dto);
  }
}
