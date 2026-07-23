import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CatalogService } from './catalog.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateCircuitDto,
  CreatePanelDto,
  CreateSpecSectionDto,
  CreateVendorDto,
  UpdateCircuitDto,
  UpdatePanelDto,
  UpdateSpecSectionDto,
  UpdateVendorDto,
} from './dto/catalog.dto';

const CATALOG_READERS = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.PROJECT_MANAGER,
  Role.HEAD_ENGINEER,
  Role.SITE_ENGINEER,
  Role.MEP_CONSULTANT,
  Role.CONSULTANT,
  Role.ARCH_CONSULTANT,
  Role.STRUCT_CONSULTANT,
] as const;

const CATALOG_MANAGERS = [Role.SUPER_ADMIN, Role.HEAD_ENGINEER] as const;

@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Roles(...CATALOG_READERS)
  @Get('spec-sections')
  findSpecSections(@Query('divisionCode') divisionCode?: string) {
    return this.catalogService.findSpecSections(divisionCode?.trim() || undefined);
  }

  @Roles(...CATALOG_MANAGERS)
  @Post('spec-sections')
  createSpecSection(@Body() dto: CreateSpecSectionDto) {
    return this.catalogService.createSpecSection(dto);
  }

  @Roles(...CATALOG_MANAGERS)
  @Patch('spec-sections/:id')
  updateSpecSection(@Param('id') id: string, @Body() dto: UpdateSpecSectionDto) {
    return this.catalogService.updateSpecSection(id, dto);
  }

  @Roles(...CATALOG_MANAGERS)
  @Delete('spec-sections/:id')
  deleteSpecSection(@Param('id') id: string) {
    return this.catalogService.softDeleteSpecSection(id);
  }

  @Roles(...CATALOG_READERS)
  @Get('vendors')
  findVendors(@Query('divisionCode') divisionCode?: string) {
    return this.catalogService.findVendors(divisionCode?.trim() || undefined);
  }

  @Roles(...CATALOG_MANAGERS)
  @Post('vendors')
  createVendor(@Body() dto: CreateVendorDto) {
    return this.catalogService.createVendor(dto);
  }

  @Roles(...CATALOG_MANAGERS)
  @Patch('vendors/:id')
  updateVendor(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.catalogService.updateVendor(id, dto);
  }

  @Roles(...CATALOG_MANAGERS)
  @Delete('vendors/:id')
  deleteVendor(@Param('id') id: string) {
    return this.catalogService.deleteVendor(id);
  }

  @Roles(...CATALOG_READERS)
  @Get('divisions')
  findDivisions() {
    return this.catalogService.findDivisions();
  }

  @Roles(...CATALOG_READERS)
  @Get('panels')
  findPanels() {
    return this.catalogService.findPanels();
  }

  @Roles(...CATALOG_MANAGERS)
  @Post('panels')
  createPanel(@Body() dto: CreatePanelDto) {
    return this.catalogService.createPanel(dto);
  }

  @Roles(...CATALOG_MANAGERS)
  @Patch('panels/:id')
  updatePanel(@Param('id') id: string, @Body() dto: UpdatePanelDto) {
    return this.catalogService.updatePanel(id, dto);
  }

  @Roles(...CATALOG_MANAGERS)
  @Delete('panels/:id')
  deletePanel(@Param('id') id: string) {
    return this.catalogService.deletePanel(id);
  }

  @Roles(...CATALOG_MANAGERS)
  @Post('panels/:panelId/circuits')
  createCircuit(
    @Param('panelId') panelId: string,
    @Body() dto: CreateCircuitDto,
  ) {
    return this.catalogService.createCircuit(panelId, dto);
  }

  @Roles(...CATALOG_MANAGERS)
  @Patch('circuits/:id')
  updateCircuit(@Param('id') id: string, @Body() dto: UpdateCircuitDto) {
    return this.catalogService.updateCircuit(id, dto);
  }

  @Roles(...CATALOG_MANAGERS)
  @Delete('circuits/:id')
  deleteCircuit(@Param('id') id: string) {
    return this.catalogService.deleteCircuit(id);
  }
}
