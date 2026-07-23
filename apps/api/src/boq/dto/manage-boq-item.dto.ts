import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBoqItemDto {
  @IsString()
  @MinLength(1)
  itemCode!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsString()
  @MinLength(1)
  unit!: string;

  @IsNumber()
  @Min(0)
  plannedQuantity!: number;

  @IsNumber()
  @Min(0)
  rateEGP!: number;

  @IsOptional()
  @IsString()
  divisionCode?: string;
}

export class UpdateBoqItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  itemCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rateEGP?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualQuantity?: number;

  @IsOptional()
  @IsString()
  divisionCode?: string;
}
