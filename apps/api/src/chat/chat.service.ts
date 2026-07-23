import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { JwtPayload } from '../common/decorators/current-user.decorator';

export const GLOBAL_CONVERSATION_ID = '00000000-0000-4000-8000-000000000001';
export const GLOBAL_CONVERSATION_NAME = 'Insider Lounge';

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
export class ChatService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureGlobalConversation();
  }

  async ensureGlobalConversation() {
    await this.prisma.conversation.upsert({
      where: { id: GLOBAL_CONVERSATION_ID },
      create: {
        id: GLOBAL_CONVERSATION_ID,
        name: GLOBAL_CONVERSATION_NAME,
        isGroup: true,
        isGlobal: true,
      },
      update: {
        name: GLOBAL_CONVERSATION_NAME,
        isGroup: true,
        isGlobal: true,
      },
    });
  }

  async syncGlobalMembership(userId: string) {
    await this.ensureGlobalConversation();

    await this.prisma.conversation.update({
      where: { id: GLOBAL_CONVERSATION_ID },
      data: {
        users: {
          connect: { id: userId },
        },
      },
    });
  }

  async syncAllActiveUsersToGlobalChat() {
    await this.ensureGlobalConversation();

    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (users.length === 0) {
      return;
    }

    await this.prisma.conversation.update({
      where: { id: GLOBAL_CONVERSATION_ID },
      data: {
        users: {
          connect: users.map((user) => ({ id: user.id })),
        },
      },
    });
  }

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
    await this.syncGlobalMembership(userId);

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
      orderBy: [{ isGlobal: 'desc' }, { updatedAt: 'desc' }],
    });

    return conversations.map((conversation) =>
      this.toConversationSummary(conversation, userId),
    );
  }

  async getGlobalConversation(userId: string) {
    await this.syncGlobalMembership(userId);
    return this.getConversationSummary(userId, GLOBAL_CONVERSATION_ID);
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

  async getConversationMemberIds(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        name: true,
        isGlobal: true,
        users: { select: { id: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
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
        isGlobal: false,
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

    return this.toConversationSummary(conversation, userId);
  }

  private toConversationSummary(
    conversation: {
      id: string;
      name: string | null;
      isGroup: boolean;
      isGlobal: boolean;
      updatedAt: Date;
      users: Array<{
        id: string;
        email: string;
        fullName: string;
        role: Role;
        isActive: boolean;
      }>;
      messages: Array<{
        id: string;
        content: string;
        senderId: string;
        conversationId: string;
        createdAt: Date;
        sender: {
          id: string;
          email: string;
          fullName: string;
          role: Role;
          isActive: boolean;
        };
      }>;
    },
    userId: string,
  ) {
    return {
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      isGlobal: conversation.isGlobal,
      updatedAt: conversation.updatedAt,
      users: conversation.users,
      lastMessage: conversation.messages[0] ?? null,
      peer: conversation.isGroup
        ? null
        : (conversation.users.find((user) => user.id !== userId) ?? null),
    };
  }
}
