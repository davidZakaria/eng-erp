import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import {
  ChatService,
  GLOBAL_CONVERSATION_ID,
  GLOBAL_CONVERSATION_NAME,
} from './chat.service';
import { ChatLanguageFilterService } from './chat-language-filter.service';
import { ChatModerationService } from './chat-moderation.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

type AuthenticatedSocket = Socket & {
  data: {
    user?: JwtPayload;
  };
};

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private chatService: ChatService,
    private languageFilter: ChatLanguageFilterService,
    private moderationService: ChatModerationService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('Missing auth token');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      client.data.user = payload;

      await client.join(this.userRoom(payload.sub));
      await this.chatService.syncGlobalMembership(payload.sub);
      await client.join(GLOBAL_CONVERSATION_ID);

      const moderation = await this.moderationService.getState(payload.sub);
      client.emit('chatStatus', {
        moderation,
        globalConversationId: GLOBAL_CONVERSATION_ID,
      });

      this.logger.debug(`Client connected: ${payload.sub}`);
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.data.user?.sub) {
      this.logger.debug(`Client disconnected: ${client.data.user.sub}`);
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const user = this.requireUser(client);
    const conversationId = payload?.conversationId?.trim();

    if (!conversationId) {
      client.emit('error', { message: 'conversationId is required' });
      return;
    }

    await this.chatService.assertMember(user.sub, conversationId);
    await client.join(conversationId);
    client.emit('joinedRoom', { conversationId });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: { conversationId?: string; content?: string },
  ) {
    const user = this.requireUser(client);
    const conversationId = payload?.conversationId?.trim();
    const content = payload?.content ?? '';

    if (!conversationId) {
      client.emit('error', { message: 'conversationId is required' });
      return;
    }

    try {
      await this.moderationService.assertCanSend(user.sub);

      const filterResult = this.languageFilter.check(content);
      if (!filterResult.clean) {
        const violation = await this.moderationService.recordViolation(user.sub);
        client.emit('chatModeration', {
          ...violation,
          message: violation.justBanned
            ? 'banned'
            : `warning-${violation.warningCount}`,
        });

        if (violation.justBanned) {
          client.emit('chatBanned', {
            bannedUntil: violation.bannedUntil,
          });
        }

        return;
      }

      const message = await this.chatService.sendMessage(
        user.sub,
        conversationId,
        content,
      );

      this.server.to(conversationId).emit('newMessage', message);
      await this.notifyRecipients(message, conversationId, user.sub);
    } catch (error) {
      let message = 'Unable to send message';
      if (error instanceof ForbiddenException) {
        const response = error.getResponse();
        if (typeof response === 'string') {
          message = response;
        } else if (
          typeof response === 'object' &&
          response &&
          'message' in response
        ) {
          const raw = (response as { message?: string | string[] }).message;
          message = Array.isArray(raw) ? raw.join(', ') : String(raw ?? message);
        }
      }

      client.emit('error', { message });

      if (message.includes('muted')) {
        const moderation = await this.moderationService.getState(user.sub);
        client.emit('chatBanned', { bannedUntil: moderation.bannedUntil });
      }
    }
  }

  private async notifyRecipients(
    message: {
      id: string;
      content: string;
      senderId: string;
      conversationId: string;
      createdAt: Date;
      sender: { fullName: string };
    },
    conversationId: string,
    senderId: string,
  ) {
    const conversation =
      await this.chatService.getConversationMemberIds(conversationId);

    const conversationName = conversation.isGlobal
      ? GLOBAL_CONVERSATION_NAME
      : (conversation.name ?? 'Direct message');

    for (const member of conversation.users) {
      if (member.id === senderId) {
        continue;
      }

      this.server.to(this.userRoom(member.id)).emit('messageNotification', {
        message,
        conversationId,
        conversationName,
        senderName: message.sender.fullName,
        preview: message.content,
      });
    }
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private requireUser(client: AuthenticatedSocket): JwtPayload {
    if (!client.data.user) {
      throw new UnauthorizedException();
    }
    return client.data.user;
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return null;
  }
}
