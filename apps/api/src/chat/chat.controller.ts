import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('users')
  getUsers(@CurrentUser() user: JwtPayload) {
    return this.chatService.getChatUsers(user);
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
