import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TrackerStatus } from '@prisma/client';

export class CreatePourTrackerEntryDto {
  @IsString()
  @IsNotEmpty()
  buildingLabel!: string;

  @IsOptional()
  @IsString()
  halfZone?: string;

  @IsOptional()
  @IsString()
  floorLevel?: string;

  @IsString()
  @IsNotEmpty()
  elementType!: string;

  @IsOptional()
  @IsString()
  elementLabel?: string;

  @IsOptional()
  @IsObject()
  rebarByDiameter?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  concreteM3?: number;

  @IsOptional()
  @IsNumber()
  rebarCostEGP?: number;

  @IsOptional()
  @IsNumber()
  concreteCostEGP?: number;

  @IsOptional()
  @IsNumber()
  laborCostEGP?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  plannedDurationDays?: number;

  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @IsOptional()
  @IsDateString()
  plannedEnd?: string;

  @IsOptional()
  @IsDateString()
  actualPourDate?: string;

  @IsOptional()
  @IsEnum(TrackerStatus)
  status?: TrackerStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePourTrackerEntryDto extends CreatePourTrackerEntryDto {}
