import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        buildings: {
          where: { deletedAt: null },
          include: {
            components: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
