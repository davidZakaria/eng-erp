import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ItemStatus } from '@prisma/client';

export class ReviewDrawingDto {
  @IsIn([ItemStatus.APPROVED_FOR_CONSTRUCTION, ItemStatus.REVISION_REQUESTED])
  statusDecision!: 'APPROVED_FOR_CONSTRUCTION' | 'REVISION_REQUESTED';

  @IsString()
  @IsNotEmpty()
  comments!: string;
}
