import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityAndOpsModule } from './security-and-ops/security-and-ops.module';
import { ProjectsModule } from './projects/projects.module';
import { ModelsModule } from './models/models.module';
import { BoqModule } from './boq/boq.module';
import { ExecutionModule } from './execution/execution.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SecurityAndOpsModule,
    ProjectsModule,
    ModelsModule,
    BoqModule,
    ExecutionModule,
    ReportsModule,
  ],
})
export class AppModule {}
