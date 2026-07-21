import { Module } from '@nestjs/common';
import { StructuralController } from './structural.controller';
import { StructuralService } from './structural.service';

@Module({
  controllers: [StructuralController],
  providers: [StructuralService],
})
export class StructuralModule {}
