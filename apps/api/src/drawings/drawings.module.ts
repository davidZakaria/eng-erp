import { Module } from '@nestjs/common';
import { DrawingsController } from './drawings.controller';
import { DrawingsService } from './drawings.service';
import { SecurityAndOpsModule } from '../security-and-ops/security-and-ops.module';

@Module({
  imports: [SecurityAndOpsModule],
  controllers: [DrawingsController],
  providers: [DrawingsService],
})
export class DrawingsModule {}
