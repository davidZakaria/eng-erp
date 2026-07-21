import { Module } from '@nestjs/common';
import { MepController } from './mep.controller';
import { MepService } from './mep.service';

@Module({
  controllers: [MepController],
  providers: [MepService],
})
export class MepModule {}
