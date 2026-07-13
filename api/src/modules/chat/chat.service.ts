import { Types } from 'mongoose';

import realtimeService, { type RealtimeService } from '../../infrastructure/realtime/realtime.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
import heatmapService, { type HeatmapService } from '../contributions/heatmap.service.js';
import postRepository, { type PostRepository } from '../posts/post.repository.js';
import UserModel from '../users/user.model.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import chatRepository, { type ChatRepository, type SaveMessageInput } from './chat.repository.js';

const deletedUserProfile = {
  url: 'https://ik.imagekit.io/disuza/DevloopFeed/ProfilePictures/defaultpp.jpg',
  fileId: '0',
};

class ChatService {
  constructor(
    private readonly chats: ChatRepository = chatRepository,
    private readonly blockRules: BlockService = blockService,
    private readonly posts: PostRepository = postRepository,
    private readonly heatmap: HeatmapService = heatmapService,
    private readonly realtime: RealtimeService = realtimeService,
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown, fallback = 20, max = 50): number {
    const limit = Number(limitInput) || fallback;
    return Math.min(Math.max(limit, 1), max);
  }

  private getOtherParticipant(participants: Array<string | Types.ObjectId>, userId: string) {
    return participants.find((participant) => participant.toString() !== userId.toString());
  }

  private isParticipant(participants: Array<string | Types.ObjectId>, userId: string) {
    return participants.some((participant) => participant.toString() === userId.toString());
  }

  async saveMessage(input: SaveMessageInput) {
    const message = typeof input.message === 'string' ? input.message.trim() : '';

    if (!message) {
      throw new BadRequestError('Message is required!');
    }

    const sender = await UserModel.findOne({ _id: input.senderId, active: { $ne: false } })
      .select('_id userName profilePicture headline')
      .lean();

    if (!sender) {
      throw new NotFoundError('User not found!');
    }

    let conversation = input.conversationId ? await this.chats.findConversationById(input.conversationId) : null;
    let receiverId = input.receiverId;
    let feedbackOwnerId: string | Types.ObjectId | null = null;

    if (conversation && !this.isParticipant(conversation.participants, input.senderId)) {
      throw new ForbiddenError('You can only send messages in your conversations!');
    }

    if (!conversation) {
      if (!receiverId) {
        throw new BadRequestError('Receiver is required!');
      }

      const receiver = await UserModel.findOne({ _id: receiverId, active: { $ne: false } }).select('_id').lean();
      if (!receiver) {
        throw new NotFoundError('User not found!');
      }

      await this.blockRules.ensureUsersCanInteract(input.senderId, receiverId, 'message');
      conversation = await this.chats.findOrCreateConversation(input.senderId, receiverId);
    } else {
      const otherParticipant = this.getOtherParticipant(conversation.participants, input.senderId);
      if (!otherParticipant) {
        throw new NotFoundError('Receiver not found!');
      }

      receiverId = otherParticipant.toString();
      const receiver = await UserModel.findOne({ _id: receiverId, active: { $ne: false } }).select('_id').lean();
      if (!receiver) {
        throw new NotFoundError('User not found!');
      }

      await this.blockRules.ensureUsersCanInteract(input.senderId, receiverId, 'message');
    }

    if (!conversation) {
      throw new BadRequestError('Conversation could not be created.');
    }

    if (input.isFeedback) {
      if (!input.feedbackOn) {
        throw new BadRequestError('feedbackOn is required when isFeedback is true');
      }

      if (input.feedbackOn === 'Post') {
        if (!input.postId) throw new BadRequestError('postId is required for Post feedback');
        const post = await this.posts.findVisibleActionTarget(input.postId);
        if (!post) throw new NotFoundError("Post doesn't exist!");
        await this.blockRules.ensureUsersCanInteract(input.senderId, post.user, 'send feedback on');
        feedbackOwnerId = post.user;
      }

      if (input.feedbackOn === 'User') {
        if (!input.userId) throw new BadRequestError('userId is required for User feedback');
        const targetUser = await UserModel.findOne({ _id: input.userId, active: { $ne: false } }).select('_id').lean();
        if (!targetUser) throw new NotFoundError('User not found!');
        await this.blockRules.ensureUsersCanInteract(input.senderId, input.userId, 'send feedback to');
        feedbackOwnerId = input.userId;
      }
    }

    const newMessage = await this.chats.createMessage(conversation, { ...input, message }, receiverId!);

    if (input.isFeedback) {
      const messageId = String((newMessage as unknown as { _id: unknown })._id);
      await Promise.all([
        this.heatmap.updateContribution(input.senderId, 'FEEDBACK', messageId, feedbackOwnerId),
        ...(input.feedbackOn === 'Post' && input.postId ? [this.posts.incrementFeedbacksCount(input.postId, 1)] : []),
      ]);
    }

    const responseMessage = {
      ...newMessage,
      senderInfo: sender,
      conversationIsUnread: true,
    };

    this.realtime.emitToUser(receiverId!.toString(), 'receive-message', responseMessage);

    return responseMessage;
  }

  async getConversations(userId: string) {
    const conversations = await this.chats.getConversations(userId);

    return Promise.all(conversations.map(async (conversation) => {
      const otherUser = conversation.otherUser?.active === false || !conversation.otherUser
        ? {
          _id: conversation.otherUserId,
          userName: 'User',
          profilePicture: deletedUserProfile,
          isDeletedUser: true,
        }
        : conversation.otherUser;

      if (!otherUser?._id) {
        return { ...conversation, otherUser };
      }

      const blockStatus = await this.blockRules.getBlockStatus(userId, otherUser._id);

      return {
        _id: conversation._id,
        otherUser,
        lastMessage: conversation.lastMessage || null,
        isUnread: conversation.isUnread,
        updatedAt: conversation.updatedAt,
        isBlocked: blockStatus.isBlocked,
        hasBlockedMe: blockStatus.hasBlockedMe,
        isUnavailable: otherUser.isDeletedUser || blockStatus.isBlocked || blockStatus.hasBlockedMe,
      };
    }));
  }

  async getMessages(conversationId: string, userId: string, pageInput: unknown, limitInput: unknown) {
    const conversation = await this.chats.findConversationForUser(conversationId, userId);

    if (!conversation) {
      throw new ForbiddenError('Bad Request!');
    }

    const otherUserId = this.getOtherParticipant(conversation.participants, userId);
    if (otherUserId) {
      const otherUser = await UserModel.findById(otherUserId).select('active').lean();
      if (otherUser && otherUser.active !== false) {
        await this.blockRules.ensureUsersCanInteract(userId, otherUserId, 'view messages with');
      }
    }

    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput);
    const messages = await this.chats.getMessages(conversationId, page, limit);
    const enrichedMessages = await this.chats.enrichFeedbackMessages(messages as Array<Record<string, unknown>>);

    return {
      messages: enrichedMessages,
      page,
      currentPage: page,
      hasMore: messages.length === limit,
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.chats.findConversationForUser(conversationId, userId);

    if (!conversation) {
      throw new NotFoundError('Conversation not found!');
    }

    const otherUserId = this.getOtherParticipant(conversation.participants, userId);
    if (otherUserId) {
      await this.blockRules.ensureUsersCanInteract(userId, otherUserId, 'mark messages from');
    }

    const lastMessage = conversation.lastMessage ? await this.chats.findMessageById(conversation.lastMessage as Types.ObjectId) : null;
    const lastMessageSenderId = lastMessage?.sender?.toString();

    if (lastMessageSenderId && lastMessageSenderId !== userId.toString() && conversation.isUnread) {
      conversation.isUnread = false;
      await conversation.save();
    }
  }

  async unsendMessage(messageId: string, userId: string) {
    const message = await this.chats.findMessageById(messageId);

    if (!message) {
      throw new NotFoundError('Message not found!');
    }

    if (message.sender.toString() !== userId.toString()) {
      throw new ForbiddenError('You can only unsend your own message!');
    }

    const conversation = await this.chats.findConversationForUser(message.conversationId, userId);

    if (!conversation) {
      throw new NotFoundError('Conversation not found!');
    }

    const wasLastMessage = conversation.lastMessage?.toString() === message._id.toString();

    if (message.isFeedback) {
      const removedByMessage = await this.heatmap.removeContribution(userId, message._id, 'FEEDBACK');

      if (!removedByMessage && message.feedbackOn?._id) {
        await this.heatmap.removeContribution(userId, message.feedbackOn._id as Types.ObjectId, 'FEEDBACK');
      }

      if (message.feedbackOn?.type === 'Post' && message.feedbackOn?._id) {
        await this.posts.incrementFeedbacksCount(message.feedbackOn._id as Types.ObjectId, -1);
      }
    }

    await this.chats.deleteMessage(message._id);

    let lastMessage = null;

    if (wasLastMessage) {
      lastMessage = await this.chats.findLatestMessage(conversation._id);
      conversation.lastMessage = lastMessage?._id || null;
      conversation.isUnread = false;
      await conversation.save();
    }

    const payload = {
      messageId: message._id,
      conversationId: conversation._id,
      participants: conversation.participants,
      lastMessage,
      wasLastMessage,
      updatedAt: conversation.updatedAt,
    };

    conversation.participants.forEach((participantId) => {
      this.realtime.emitToUser(participantId.toString(), 'message-unsent', payload);
    });

    return payload;
  }

  async deleteConversationForUser(conversationId: string, userId: string) {
    const conversation = await this.chats.findConversationForUser(conversationId, userId);

    if (!conversation) {
      throw new NotFoundError('Conversation not found!');
    }

    const hiddenSet = new Set((conversation.hiddenBy || []).map((id) => id.toString()));
    hiddenSet.add(userId.toString());
    conversation.hiddenBy = [...hiddenSet].map((id) => new Types.ObjectId(id));
    await conversation.save();

    const participantIds = conversation.participants.map((id) => id.toString());
    const otherParticipantId = conversation.participants.find((id) => id.toString() !== userId.toString());
    const otherParticipant = otherParticipantId
      ? await UserModel.findById(otherParticipantId).select('active').lean()
      : null;
    const hiddenForEveryone = !otherParticipant || otherParticipant.active === false || participantIds.every((id) => hiddenSet.has(id));

    return {
      conversationId: conversation._id,
      hiddenForEveryone,
    };
  }
}

const chatService = new ChatService();

export { ChatService };
export default chatService;
