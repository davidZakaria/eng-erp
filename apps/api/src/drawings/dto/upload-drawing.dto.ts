import {
  IsEnum,
  IsNotEmpty,
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
}

export { ALLOWED_EXTENSIONS };
