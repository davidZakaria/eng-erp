import { Module } from '@nestjs/common';
import { RfiController } from './rfi.controller';
import { RfiService } from './rfi.service';

@Module({
  controllers: [RfiController],
  providers: [RfiService],
})
export class RfiModule {}
