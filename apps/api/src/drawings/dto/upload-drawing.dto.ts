import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Discipline } from '@prisma/client';

const ALLOWED_EXTENSIONS = ['.dwg', '.dxf', '.pdf'];

export function isAllowedCadExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export class UploadDrawingDto {
  @IsString()
  @IsNotEmpty()
  drawingNumber!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(Discipline)
  discipline!: Discipline;

  /** Object key from pre-signed upload (`bucket/key` format). */
  @IsOptional()
  @IsString()
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

export { ALLOWED_EXTENSIONS };
