import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { JwtPayload } from '../common/decorators/current-user.decorator';

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
} as const;

const MESSAGE_INCLUDE = {
  sender: {
    select: USER_SELECT,
  },
} as const;

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getChatUsers(actor: JwtPayload) {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        id: { not: actor.sub },
      },
      select: USER_SELECT,
      orderBy: { fullName: 'asc' },
    });

    if (actor.role === Role.SUPER_ADMIN) {
      return users;
    }

    return users.filter((user) => user.role !== Role.SUPER_ADMIN);
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        users: { some: { id: userId } },
      },
      include: {
        users: { select: USER_SELECT },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: MESSAGE_INCLUDE,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((conversation) => ({
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      updatedAt: conversation.updatedAt,
      users: conversation.users,
      lastMessage: conversation.messages[0] ?? null,
      peer: conversation.isGroup
        ? null
        : (conversation.users.find((user) => user.id !== userId) ?? null),
    }));
  }

  async getMessages(userId: string, conversationId: string) {
    await this.assertMember(userId, conversationId);

    return this.prisma.message.findMany({
      where: { conversationId },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(senderId: string, conversationId: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new ForbiddenException('Message content is required');
    }

    await this.assertMember(senderId, conversationId);

    const message = await this.prisma.message.create({
      data: {
        content: trimmed,
        senderId,
        conversationId,
      },
      include: MESSAGE_INCLUDE,
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async createDirectMessage(user1Id: string, user2Id: string) {
    if (user1Id === user2Id) {
      throw new ForbiddenException('Cannot start a chat with yourself');
    }

    const target = await this.prisma.user.findFirst({
      where: {
        id: user2Id,
        deletedAt: null,
        isActive: true,
      },
      select: USER_SELECT,
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const existingCandidates = await this.prisma.conversation.findMany({
      where: {
        isGroup: false,
        users: { some: { id: user1Id } },
      },
      include: {
        users: { select: { id: true } },
      },
    });

    const existing = existingCandidates.find(
      (conversation) =>
        conversation.users.length === 2 &&
        conversation.users.some((user) => user.id === user1Id) &&
        conversation.users.some((user) => user.id === user2Id),
    );

    if (existing) {
      return this.getConversationSummary(user1Id, existing.id);
    }

    const created = await this.prisma.conversation.create({
      data: {
        isGroup: false,
        users: {
          connect: [{ id: user1Id }, { id: user2Id }],
        },
      },
    });

    return this.getConversationSummary(user1Id, created.id);
  }

  async assertMember(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        users: { some: { id: userId } },
      },
      select: { id: true },
    });

    if (!conversation) {
      throw new ForbiddenException('You are not a member of this conversation');
    }
  }

  private async getConversationSummary(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        users: { select: USER_SELECT },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: MESSAGE_INCLUDE,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      updatedAt: conversation.updatedAt,
      users: conversation.users,
      lastMessage: conversation.messages[0] ?? null,
      peer: conversation.isGroup
        ? null
        : (conversation.users.find((user) => user.id !== userId) ?? null),
    };
  }
}
