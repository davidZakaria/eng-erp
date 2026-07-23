import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BoqService } from './boq.service';
import { CreateBoqDto } from './dto/create-boq.dto';
import { ExecuteQuantityDto } from './dto/execute-quantity.dto';
import {
  CreateBoqItemDto,
  UpdateBoqItemDto,
} from './dto/manage-boq-item.dto';
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

  @Roles(
    Role.HEAD_ENGINEER,
    Role.PROJECT_MANAGER,
    Role.SITE_ENGINEER,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  )
  @Get('items')
  findAllItems() {
    return this.boqService.findAllItems();
  }

  @Roles(Role.HEAD_ENGINEER, Role.SITE_ENGINEER, Role.ADMIN, Role.SUPER_ADMIN)
  @Post('execute-quantity')
  executeQuantity(@Body() dto: ExecuteQuantityDto) {
    return this.boqService.executeQuantity(dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.HEAD_ENGINEER)
  @Post('items')
  createItem(@Body() dto: CreateBoqItemDto) {
    return this.boqService.createItem(dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.HEAD_ENGINEER)
  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateBoqItemDto) {
    return this.boqService.updateItem(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.HEAD_ENGINEER)
  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.boqService.deleteItem(id);
  }
}
