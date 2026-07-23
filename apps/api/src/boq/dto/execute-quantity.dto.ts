import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class ExecuteQuantityDto {
  @IsString()
  @IsNotEmpty()
  boqItemId!: string;

  @IsNumber()
  @IsPositive()
  installedQuantity!: number;
}
