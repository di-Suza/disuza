import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import chatService, { type ChatService } from './chat.service.js';

class ChatController {
  readonly sendMessage: RequestHandler;
  readonly getConversations: RequestHandler;
  readonly getMessages: RequestHandler;
  readonly markAsRead: RequestHandler;
  readonly unsendMessage: RequestHandler;
  readonly deleteConversation: RequestHandler;

  constructor(private readonly service: ChatService = chatService) {
    this.sendMessage = asyncHandler(this.handleSendMessage.bind(this));
    this.getConversations = asyncHandler(this.handleGetConversations.bind(this));
    this.getMessages = asyncHandler(this.handleGetMessages.bind(this));
    this.markAsRead = asyncHandler(this.handleMarkAsRead.bind(this));
    this.unsendMessage = asyncHandler(this.handleUnsendMessage.bind(this));
    this.deleteConversation = asyncHandler(this.handleDeleteConversation.bind(this));
  }

  private async handleSendMessage(req: Request, res: Response) {
    const newMessage = await this.service.saveMessage({ ...req.body, senderId: req.user!.id });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully!',
      newMessage,
    });
  }

  private async handleGetConversations(req: Request, res: Response) {
    const conversations = await this.service.getConversations(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Conversations fetched successfully!',
      conversations,
    });
  }

  private async handleGetMessages(req: Request, res: Response) {
    const data = await this.service.getMessages(String(req.params.conversationId), req.user!.id, req.query.page, req.query.limit);

    res.status(200).json({
      success: true,
      message: 'Messages fetched successfully!',
      ...data,
    });
  }

  private async handleMarkAsRead(req: Request, res: Response) {
    await this.service.markAsRead(String(req.params.conversationId), req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read!',
    });
  }

  private async handleUnsendMessage(req: Request, res: Response) {
    const data = await this.service.unsendMessage(String(req.params.messageId), req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Message unsent successfully!',
      ...data,
    });
  }

  private async handleDeleteConversation(req: Request, res: Response) {
    const data = await this.service.deleteConversationForUser(String(req.params.conversationId), req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully!',
      ...data,
    });
  }
}

const chatController = new ChatController();

export { ChatController };
export default chatController;
