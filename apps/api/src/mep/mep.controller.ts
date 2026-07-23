import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MepService } from './mep.service';
import { CreateMaterialSubmittalDto } from './dto/create-material-submittal.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('mep')
export class MepController {
  constructor(private mepService: MepService) {}

  @Roles(
    Role.MEP_CONSULTANT,
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  )
  @Post('submittals')
  createSubmittal(@Body() dto: CreateMaterialSubmittalDto) {
    return this.mepService.createSubmittal(dto);
  }

  @Roles(
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.MEP_CONSULTANT,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  )
  @Get('submittals')
  findAllSubmittals() {
    return this.mepService.findAllSubmittals();
  }

  @Roles(
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.MEP_CONSULTANT,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  )
  @Get('panels')
  findAllPanels() {
    return this.mepService.findAllPanels();
  }

  @Roles(
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.MEP_CONSULTANT,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  )
  @Get('panels/:id/load')
  calculatePanelLoad(@Param('id') id: string) {
    return this.mepService.calculatePanelLoad(id);
  }
}
