import { Module } from '@nestjs/common';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';
import { SecurityAndOpsModule } from '../security-and-ops/security-and-ops.module';

@Module({
  imports: [SecurityAndOpsModule],
  controllers: [BackupsController],
  providers: [BackupsService],
})
export class BackupsModule {}
