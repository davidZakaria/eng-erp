import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExecutionLogDto {
  @IsString()
  @IsNotEmpty()
  buildingComponentId!: string;

  @IsOptional()
  @IsString()
  modelSubmissionId?: string;

  @IsNumber()
  @Min(0)
  actualConcreteM3!: number;

  @IsObject()
  actualRebarByDiameter!: Record<string, number>;

  @IsDateString()
  actualPourDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
