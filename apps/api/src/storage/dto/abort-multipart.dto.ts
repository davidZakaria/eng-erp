import { IsNotEmpty, IsString } from 'class-validator';

export class AbortMultipartDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  uploadId!: string;
}
