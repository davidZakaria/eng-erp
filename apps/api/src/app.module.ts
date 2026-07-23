import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityAndOpsModule } from './security-and-ops/security-and-ops.module';
import { ProjectsModule } from './projects/projects.module';
import { ModelsModule } from './models/models.module';
import { BoqModule } from './boq/boq.module';
import { ExecutionModule } from './execution/execution.module';
import { ReportsModule } from './reports/reports.module';
import { DrawingsModule } from './drawings/drawings.module';
import { StructuralModule } from './structural/structural.module';
import { MepModule } from './mep/mep.module';
import { DefectsModule } from './defects/defects.module';
import { RfiModule } from './rfi/rfi.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { BackupsModule } from './backups/backups.module';
import { CatalogModule } from './catalog/catalog.module';
import { ChatModule } from './chat/chat.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get<string>('THROTTLE_TTL_MS') ?? 60_000),
          limit: Number(config.get<string>('THROTTLE_LIMIT') ?? 120),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SecurityAndOpsModule,
    UsersModule,
    AuditModule,
    BackupsModule,
    CatalogModule,
    ChatModule,
    ProjectsModule,
    ModelsModule,
    BoqModule,
    ExecutionModule,
    ReportsModule,
    DrawingsModule,
    StructuralModule,
    MepModule,
    DefectsModule,
    RfiModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
