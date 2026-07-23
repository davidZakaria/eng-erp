import { Module } from '@nestjs/common';
import { DrawingsController } from './drawings.controller';
import { DrawingsService } from './drawings.service';
import { SecurityAndOpsModule } from '../security-and-ops/security-and-ops.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [SecurityAndOpsModule, StorageModule],
  controllers: [DrawingsController],
  providers: [DrawingsService],
})
export class DrawingsModule {}
