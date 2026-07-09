import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import chatController from './chat.controller.js';
import {
  deleteConversationRules,
  getMessagesRules,
  markAsReadRules,
  sendMessageRules,
  unsendMessageRules,
} from './validators/chat.validator.js';

class ChatRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.post('/sendMessage', sendMessageRules, validateRequest, chatController.sendMessage);
    this.router.get('/getConversations', chatController.getConversations);
    this.router.get('/getMessages/:conversationId', getMessagesRules, validateRequest, chatController.getMessages);
    this.router.patch('/markAsRead/:conversationId', markAsReadRules, validateRequest, chatController.markAsRead);
    this.router.delete('/unsendMessage/:messageId', unsendMessageRules, validateRequest, chatController.unsendMessage);
    this.router.delete('/deleteConversation/:conversationId', deleteConversationRules, validateRequest, chatController.deleteConversation);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { ChatRoutes };
export default new ChatRoutes().getRouter();