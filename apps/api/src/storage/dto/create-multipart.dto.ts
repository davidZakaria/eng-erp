import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMultipartDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;
}
