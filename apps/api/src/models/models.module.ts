import { Module } from '@nestjs/common';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';
import { SecurityAndOpsModule } from '../security-and-ops/security-and-ops.module';

@Module({
  imports: [SecurityAndOpsModule],
  controllers: [ModelsController],
  providers: [ModelsService],
})
export class ModelsModule {}
