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
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
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

    const message = await this.chatService.sendMessage(
      user.sub,
      conversationId,
      content,
    );

    this.server.to(conversationId).emit('newMessage', message);
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
