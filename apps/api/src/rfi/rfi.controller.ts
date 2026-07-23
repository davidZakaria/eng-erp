import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RfiService } from './rfi.service';
import { AnswerRfiDto } from './dto/answer-rfi.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('rfi')
export class RfiController {
  constructor(private rfiService: RfiService) {}

  @Roles(
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.SITE_ENGINEER,
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
    Role.ADMIN,
  )
  @Get()
  findAll() {
    return this.rfiService.findAll();
  }

  @Roles(
    Role.CONSULTANT,
    Role.ARCH_CONSULTANT,
    Role.STRUCT_CONSULTANT,
    Role.MEP_CONSULTANT,
    Role.HEAD_ENGINEER,
    Role.ADMIN,
  )
  @Patch(':id/answer')
  answerRfi(@Param('id') id: string, @Body() dto: AnswerRfiDto) {
    return this.rfiService.answerRfi(id, dto);
  }
}
