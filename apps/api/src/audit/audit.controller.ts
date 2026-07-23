import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.module';

@Controller('audit-logs')
@Roles(Role.SUPER_ADMIN)
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('tableName') tableName?: string,
  ) {
    const take = Math.min(Number(limit) || 100, 500);

    return this.prisma.auditLog.findMany({
      where: tableName ? { targetTable: tableName } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });
  }
}
