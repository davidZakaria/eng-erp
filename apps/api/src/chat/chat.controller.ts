import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatModerationService } from './chat-moderation.service';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private moderationService: ChatModerationService,
  ) {}

  @Get('users')
  getUsers(@CurrentUser() user: JwtPayload) {
    return this.chatService.getChatUsers(user);
  }

  @Get('status')
  async getStatus(@CurrentUser() user: JwtPayload) {
    await this.chatService.syncGlobalMembership(user.sub);
    const moderation = await this.moderationService.getState(user.sub);
    const globalConversation = await this.chatService.getGlobalConversation(
      user.sub,
    );

    return {
      moderation,
      globalConversation,
    };
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: JwtPayload) {
    return this.chatService.getConversations(user.sub);
  }

  @Get('conversations/:id/messages')
  getMessages(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.chatService.getMessages(user.sub, id);
  }

  @Post('conversations/direct')
  createDirectMessage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDirectMessageDto,
  ) {
    return this.chatService.createDirectMessage(user.sub, dto.targetUserId);
  }
}
