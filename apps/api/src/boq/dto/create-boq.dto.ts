import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  Min,
} from 'class-validator';

export class CreateBoqDto {
  @IsString()
  @IsNotEmpty()
  buildingComponentId!: string;

  @IsNumber()
  @Min(0)
  plannedConcreteM3!: number;

  @IsObject()
  plannedRebarByDiameter!: Record<string, number>;

  @IsDateString()
  plannedStartDate!: string;

  @IsDateString()
  plannedEndDate!: string;
}
