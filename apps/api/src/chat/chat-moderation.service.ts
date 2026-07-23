import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

const WARNING_LIMIT = 3;
const BAN_DURATION_MS = 60_000;

export type ChatModerationState = {
  warningCount: number;
  bannedUntil: string | null;
  isBanned: boolean;
};

export type ChatViolationResult = ChatModerationState & {
  issuedWarning: boolean;
  justBanned: boolean;
};

@Injectable()
export class ChatModerationService {
  constructor(private prisma: PrismaService) {}

  async getState(userId: string): Promise<ChatModerationState> {
    const record = await this.prisma.chatModeration.findUnique({
      where: { userId },
    });

    return this.toState(record);
  }

  async assertCanSend(userId: string): Promise<ChatModerationState> {
    const state = await this.getState(userId);
    if (state.isBanned) {
      throw new ForbiddenException(
        `You are muted until ${state.bannedUntil}`,
      );
    }
    return state;
  }

  async recordViolation(userId: string): Promise<ChatViolationResult> {
    const existing = await this.prisma.chatModeration.findUnique({
      where: { userId },
    });

    const now = new Date();
    const activeBan =
      existing?.bannedUntil && existing.bannedUntil.getTime() > now.getTime();

    if (activeBan) {
      return {
        ...this.toState(existing),
        issuedWarning: false,
        justBanned: false,
      };
    }

    const nextWarnings = (existing?.warningCount ?? 0) + 1;
    const justBanned = nextWarnings >= WARNING_LIMIT;
    const bannedUntil = justBanned
      ? new Date(now.getTime() + BAN_DURATION_MS)
      : null;

    const saved = await this.prisma.chatModeration.upsert({
      where: { userId },
      create: {
        userId,
        warningCount: justBanned ? 0 : nextWarnings,
        bannedUntil,
      },
      update: {
        warningCount: justBanned ? 0 : nextWarnings,
        bannedUntil,
      },
    });

    return {
      ...this.toState(saved),
      issuedWarning: !justBanned,
      justBanned,
    };
  }

  private toState(
    record: { warningCount: number; bannedUntil: Date | null } | null,
  ): ChatModerationState {
    const bannedUntil =
      record?.bannedUntil && record.bannedUntil.getTime() > Date.now()
        ? record.bannedUntil.toISOString()
        : null;

    return {
      warningCount: record?.warningCount ?? 0,
      bannedUntil,
      isBanned: Boolean(bannedUntil),
    };
  }
}
