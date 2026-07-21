import { IsBoolean } from 'class-validator';

export class UpdatePourChecklistDto {
  @IsBoolean()
  formworkApproved!: boolean;

  @IsBoolean()
  rebarApproved!: boolean;

  @IsBoolean()
  ptCablesXApproved!: boolean;

  @IsBoolean()
  ptCablesYApproved!: boolean;
}
