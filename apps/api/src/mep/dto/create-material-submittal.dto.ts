import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMaterialSubmittalDto {
  @IsString()
  @IsNotEmpty()
  equipmentTag!: string;

  @IsString()
  @IsNotEmpty()
  proposedVendor!: string;

  @IsBoolean()
  isApprovedVendor!: boolean;

  @IsOptional()
  @IsString()
  equivalenceLetterUrl?: string;

  @IsOptional()
  @IsInt()
  leadTimeWeeks?: number;

  @IsOptional()
  @IsNumber()
  costDeltaEGP?: number;

  @IsString()
  @IsNotEmpty()
  divisionId!: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  specSectionId?: string;
}
