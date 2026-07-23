import { Module } from '@nestjs/common';
import { PourTrackerController } from './pour-tracker.controller';
import { PourTrackerService } from './pour-tracker.service';

@Module({
  controllers: [PourTrackerController],
  providers: [PourTrackerService],
  exports: [PourTrackerService],
})
export class PourTrackerModule {}
