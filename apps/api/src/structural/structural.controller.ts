import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StructuralService } from './structural.service';
import { UpdatePourChecklistDto } from './dto/update-pour-checklist.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('structural')
export class StructuralController {
  constructor(private structuralService: StructuralService) {}

  @Roles(Role.HEAD_ENGINEER, Role.PROJECT_MANAGER, Role.ADMIN)
  @Get('pour-clearances')
  findAll() {
    return this.structuralService.findAllPourClearances();
  }

  @Roles(Role.HEAD_ENGINEER, Role.PROJECT_MANAGER, Role.ADMIN)
  @Patch('pour-clearances/:id/checklist')
  updateChecklist(
    @Param('id') id: string,
    @Body() dto: UpdatePourChecklistDto,
  ) {
    return this.structuralService.updateChecklist(id, dto);
  }

  @Roles(Role.HEAD_ENGINEER)
  @Post('pour-clearances/:id/approve')
  approvePour(@Param('id') id: string) {
    return this.structuralService.approvePour(id);
  }
}
