import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import { uploadChatAttachment } from '../media/media.middleware.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import chatController from './chat.controller.js';
import {
  acceptGroupInviteRules,
  attachmentRules,
  createGroupRules,
  deleteConversationRules,
  getMessagesRules,
  inviteGroupMembersRules,
  markAsReadRules,
  pinConversationRules,
  removeGroupMemberRules,
  sendMessageRules,
  startConversationRules,
  updateGroupRules,
  unsendMessageRules,
} from './validators/chat.validator.js';

class ChatRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.post('/sendMessage', uploadChatAttachment, sendMessageRules, validateRequest, chatController.sendMessage);
    this.router.post('/startConversation', startConversationRules, validateRequest, chatController.startConversation);
    this.router.patch('/pin/:conversationId', pinConversationRules, validateRequest, chatController.pinConversation);
    this.router.post('/groups', createGroupRules, validateRequest, chatController.createGroup);
    this.router.post('/groups/:conversationId/accept', acceptGroupInviteRules, validateRequest, chatController.acceptGroupInvite);
    this.router.patch('/groups/:conversationId', updateGroupRules, validateRequest, chatController.updateGroupDetails);
    this.router.post('/groups/:conversationId/invite', inviteGroupMembersRules, validateRequest, chatController.inviteGroupMembers);
    this.router.delete('/groups/:conversationId/members/:memberId', removeGroupMemberRules, validateRequest, chatController.removeGroupMember);
    this.router.get('/getConversations', chatController.getConversations);
    this.router.get('/getMessages/:conversationId', getMessagesRules, validateRequest, chatController.getMessages);
    this.router.get('/attachments/:messageId/:fileId', attachmentRules, validateRequest, chatController.getAttachment);
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
