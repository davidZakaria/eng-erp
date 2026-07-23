import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AnswerRfiDto } from './dto/answer-rfi.dto';

const VO_WARNING =
  'Draft Variation Order (VO) workflow has been triggered for the Commercial Team.';

@Injectable()
export class RfiService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.rFI.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async answerRfi(id: string, dto: AnswerRfiDto) {
    const rfi = await this.prisma.rFI.findUnique({ where: { id } });

    if (!rfi) {
      throw new NotFoundException('RFI not found');
    }

    const impactsCost = dto.impactsCost ?? false;

    const updated = await this.prisma.rFI.update({
      where: { id },
      data: {
        answer: dto.answer,
        status: 'ANSWERED',
        impactsCost,
      },
    });

    return {
      ...updated,
      voWarning: impactsCost ? VO_WARNING : null,
    };
  }
}
