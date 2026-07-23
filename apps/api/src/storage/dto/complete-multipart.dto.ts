import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

class MultipartPartDto {
  @IsNumber()
  PartNumber!: number;

  @IsString()
  @IsNotEmpty()
  ETag!: string;
}

export class CompleteMultipartDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  uploadId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MultipartPartDto)
  parts!: MultipartPartDto[];
}
