import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ModelStatus } from '@prisma/client';

export class CreateModelSubmissionDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class ReviewModelSubmissionDto {
  @IsIn([
    ModelStatus.APPROVED_FOR_CONSTRUCTION,
    ModelStatus.REVISION_REQUESTED,
  ])
  statusDecision!: 'APPROVED_FOR_CONSTRUCTION' | 'REVISION_REQUESTED';

  @IsString()
  @IsNotEmpty()
  comments!: string;
}
