import { Module } from '@nestjs/common';
import { SecurityAndOpsModule } from '../security-and-ops/security-and-ops.module';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { ChatLanguageFilterService } from './chat-language-filter.service';
import { ChatModerationService } from './chat-moderation.service';

@Module({
  imports: [SecurityAndOpsModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    ChatLanguageFilterService,
    ChatModerationService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
