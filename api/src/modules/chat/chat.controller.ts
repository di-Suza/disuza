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
  readonly getAttachment: RequestHandler;
  readonly startConversation: RequestHandler;
  readonly pinConversation: RequestHandler;
  readonly createGroup: RequestHandler;
  readonly acceptGroupInvite: RequestHandler;
  readonly updateGroupDetails: RequestHandler;
  readonly inviteGroupMembers: RequestHandler;
  readonly removeGroupMember: RequestHandler;

  constructor(private readonly service: ChatService = chatService) {
    this.sendMessage = asyncHandler(this.handleSendMessage.bind(this));
    this.getConversations = asyncHandler(this.handleGetConversations.bind(this));
    this.getMessages = asyncHandler(this.handleGetMessages.bind(this));
    this.markAsRead = asyncHandler(this.handleMarkAsRead.bind(this));
    this.unsendMessage = asyncHandler(this.handleUnsendMessage.bind(this));
    this.deleteConversation = asyncHandler(this.handleDeleteConversation.bind(this));
    this.getAttachment = asyncHandler(this.handleGetAttachment.bind(this));
    this.startConversation = asyncHandler(this.handleStartConversation.bind(this));
    this.pinConversation = asyncHandler(this.handlePinConversation.bind(this));
    this.createGroup = asyncHandler(this.handleCreateGroup.bind(this));
    this.acceptGroupInvite = asyncHandler(this.handleAcceptGroupInvite.bind(this));
    this.updateGroupDetails = asyncHandler(this.handleUpdateGroupDetails.bind(this));
    this.inviteGroupMembers = asyncHandler(this.handleInviteGroupMembers.bind(this));
    this.removeGroupMember = asyncHandler(this.handleRemoveGroupMember.bind(this));
  }

  private async handleSendMessage(req: Request, res: Response) {
    const newMessage = await this.service.saveMessage({ ...req.body, senderId: req.user!.id }, req.file);

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

  private async handleStartConversation(req: Request, res: Response) {
    const data = await this.service.startConversation(req.user!.id, req.body.receiverId);

    res.status(201).json({
      success: true,
      message: 'Conversation ready!',
      ...data,
    });
  }

  private async handlePinConversation(req: Request, res: Response) {
    const data = await this.service.setConversationPinned(req.user!.id, String(req.params.conversationId), Boolean(req.body.pinned));

    res.status(200).json({
      success: true,
      message: data.conversation?.isPinned ? 'Conversation pinned!' : 'Conversation unpinned!',
      ...data,
    });
  }

  private async handleCreateGroup(req: Request, res: Response) {
    const data = await this.service.createGroup(req.user!.id, req.body.memberIds, req.body.groupName);

    res.status(201).json({
      success: true,
      message: 'Group created successfully!',
      ...data,
    });
  }

  private async handleAcceptGroupInvite(req: Request, res: Response) {
    const data = await this.service.acceptGroupInvite(req.user!.id, String(req.params.conversationId));

    res.status(200).json({
      success: true,
      message: 'Group invite accepted!',
      ...data,
    });
  }

  private async handleUpdateGroupDetails(req: Request, res: Response) {
    const data = await this.service.updateGroupDetails(req.user!.id, String(req.params.conversationId), req.body.groupName);

    res.status(200).json({
      success: true,
      message: 'Group updated successfully!',
      ...data,
    });
  }

  private async handleInviteGroupMembers(req: Request, res: Response) {
    const data = await this.service.inviteGroupMembers(req.user!.id, String(req.params.conversationId), req.body.memberIds);

    res.status(200).json({
      success: true,
      message: 'Group invites sent!',
      ...data,
    });
  }

  private async handleRemoveGroupMember(req: Request, res: Response) {
    const data = await this.service.removeGroupMember(req.user!.id, String(req.params.conversationId), String(req.params.memberId));

    res.status(200).json({
      success: true,
      message: 'Group member updated!',
      ...data,
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
    const data = await this.service.markAsRead(String(req.params.conversationId), req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read!',
      ...data,
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

  private async handleGetAttachment(req: Request, res: Response) {
    const attachment = await this.service.getAttachmentAccess(req.user!.id, String(req.params.messageId), String(req.params.fileId));
    const storageResponse = await fetch(attachment.url);

    if (!storageResponse.ok) {
      res.status(502).json({
        success: false,
        message: 'Attachment could not be loaded.',
      });
      return;
    }

    const buffer = Buffer.from(await storageResponse.arrayBuffer());
    const fileName = (attachment.name || 'attachment').replace(/["\r\n]/g, '');

    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('Content-Type', attachment.mime || storageResponse.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(buffer);
  }
}

const chatController = new ChatController();

export { ChatController };
export default chatController;
