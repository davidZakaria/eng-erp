import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSiteDefectDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsOptional()
  @IsIn(['HIGH', 'MEDIUM', 'LOW'])
  severity?: string;
}

export class UpdateSiteDefectStatusDto {
  @IsIn(['OPEN', 'FIXED'])
  status!: 'OPEN' | 'FIXED';
}
