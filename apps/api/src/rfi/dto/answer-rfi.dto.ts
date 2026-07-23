import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AnswerRfiDto {
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @IsOptional()
  @IsBoolean()
  impactsCost?: boolean;
}
