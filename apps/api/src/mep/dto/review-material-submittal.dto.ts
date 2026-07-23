import { IsIn } from 'class-validator';
import { ItemStatus } from '@prisma/client';

export class ReviewMaterialSubmittalDto {
  @IsIn([ItemStatus.APPROVED_FOR_CONSTRUCTION, ItemStatus.REVISION_REQUESTED])
  statusDecision!:
    | 'APPROVED_FOR_CONSTRUCTION'
    | 'REVISION_REQUESTED';
}
