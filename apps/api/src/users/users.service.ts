import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.module';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(actor: JwtPayload) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: PUBLIC_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    if (actor.role === Role.SUPER_ADMIN) {
      return users;
    }

    // Head engineer cannot see Super Admins
    return users.filter((u) => u.role !== Role.SUPER_ADMIN);
  }

  async create(actor: JwtPayload, dto: CreateUserDto) {
    this.assertCanManageRole(actor, dto.role);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        fullName: dto.fullName.trim(),
        role: dto.role,
        isActive: true,
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  async update(actor: JwtPayload, id: string, dto: UpdateUserDto) {
    const target = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    this.assertCanManageRole(actor, target.role);
    if (dto.role) {
      this.assertCanManageRole(actor, dto.role);
    }

    const data: Record<string, unknown> = {};
    if (dto.email) data.email = dto.email.toLowerCase().trim();
    if (dto.fullName) data.fullName = dto.fullName.trim();
    if (dto.role) data.role = dto.role;
    if (typeof dto.isActive === 'boolean') data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_USER_SELECT,
    });
  }

  async softDelete(actor: JwtPayload, id: string) {
    const target = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    this.assertCanManageRole(actor, target.role);

    if (target.id === actor.sub) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  private assertCanManageRole(actor: JwtPayload, targetRole: Role) {
    if (actor.role === Role.SUPER_ADMIN) {
      return;
    }

    if (actor.role === Role.HEAD_ENGINEER) {
      if (targetRole === Role.SUPER_ADMIN) {
        throw new ForbiddenException(
          'HEAD_ENGINEER cannot manage SUPER_ADMIN accounts',
        );
      }
      return;
    }

    throw new ForbiddenException('Insufficient role permissions');
  }
}
