import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  MinLength,
} from 'class-validator';
import { PanelPhase } from '@prisma/client';

export class CreateSpecSectionDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  divisionCode!: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class UpdateSpecSectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  divisionCode?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class CreateVendorDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  divisionCode!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  disciplineTag?: string;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  divisionCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  disciplineTag?: string;
}

export class CreatePanelDto {
  @IsString()
  @MinLength(1)
  panelReference!: string;

  @IsString()
  @MinLength(1)
  location!: string;

  @IsString()
  @MinLength(1)
  incomingCB!: string;
}

export class UpdatePanelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  panelReference?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  location?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  incomingCB?: string;
}

export class CreateCircuitDto {
  @IsInt()
  @Min(1)
  circuitNumber!: number;

  @IsNumber()
  @Min(0)
  mcbRating!: number;

  @IsString()
  @MinLength(1)
  wireSize!: string;

  @IsString()
  @MinLength(1)
  loadType!: string;

  @IsNumber()
  @Min(0)
  connectedLoadVA!: number;

  @IsNumber()
  @Min(0)
  demandFactor!: number;

  @IsEnum(PanelPhase)
  phase!: PanelPhase;
}

export class UpdateCircuitDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  circuitNumber?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mcbRating?: number;

  @IsOptional()
  @IsString()
  wireSize?: string;

  @IsOptional()
  @IsString()
  loadType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  connectedLoadVA?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  demandFactor?: number;

  @IsOptional()
  @IsEnum(PanelPhase)
  phase?: PanelPhase;
}
