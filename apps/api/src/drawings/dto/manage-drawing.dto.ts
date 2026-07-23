import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Discipline, ItemStatus } from '@prisma/client';
import { isAllowedCadExtension } from './upload-drawing.dto';

export class CreateDrawingAdminDto {
  @IsString()
  @MinLength(1)
  drawingNumber!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsEnum(Discipline)
  discipline!: Discipline;

  @IsInt()
  @Min(0)
  revision!: number;

  @IsEnum(ItemStatus)
  status!: ItemStatus;

  @IsString()
  @MinLength(1)
  fileUrl!: string;

  @IsOptional()
  @IsString()
  projectNumber?: string;

  @IsOptional()
  @IsString()
  disciplineCode?: string;

  @IsOptional()
  @IsString()
  sheetNumber?: string;

  @IsOptional()
  @IsString()
  sheetSize?: string;

  @IsOptional()
  @IsString()
  scale?: string;

  @IsOptional()
  @IsString()
  packageName?: string;
}

export class UpdateDrawingAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  drawingNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsEnum(Discipline)
  discipline?: Discipline;

  @IsOptional()
  @IsInt()
  @Min(0)
  revision?: number;

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @IsOptional()
  @IsString()
  @MinLength(1)
  fileUrl?: string;

  @IsOptional()
  @IsString()
  projectNumber?: string;

  @IsOptional()
  @IsString()
  disciplineCode?: string;

  @IsOptional()
  @IsString()
  sheetNumber?: string;

  @IsOptional()
  @IsString()
  sheetSize?: string;

  @IsOptional()
  @IsString()
  scale?: string;

  @IsOptional()
  @IsString()
  packageName?: string;
}

export function assertDrawingFileUrl(fileUrl: string) {
  const fileName = fileUrl.split('/').pop() ?? '';
  if (!isAllowedCadExtension(fileName)) {
    throw new Error(
      'Allowed formats: .dwg (preferred), .dxf, .pdf',
    );
  }
}
