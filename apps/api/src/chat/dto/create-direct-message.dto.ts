import { IsString, MinLength } from 'class-validator';

export class CreateDirectMessageDto {
  @IsString()
  @MinLength(1)
  targetUserId!: string;
}
