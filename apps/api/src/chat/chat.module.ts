import { Module } from '@nestjs/common';
import { SecurityAndOpsModule } from '../security-and-ops/security-and-ops.module';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';

@Module({
  imports: [SecurityAndOpsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
