import { Body, Controller, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BoqService } from './boq.service';
import { CreateBoqDto } from './dto/create-boq.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('boq')
export class BoqController {
  constructor(private boqService: BoqService) {}

  @Roles(Role.PROJECT_MANAGER)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBoqDto) {
    return this.boqService.create(user.sub, dto);
  }
}
