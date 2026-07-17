import { Types } from 'mongoose';

import cleanupQueue, { type CleanupQueue } from '../../infrastructure/jobs/cleanup.queue.js';
import realtimeService, { type RealtimeService } from '../../infrastructure/realtime/realtime.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
import collabRepository, { type CollabRepository } from '../collab/collab.repository.js';
import heatmapService, { type HeatmapService } from '../contributions/heatmap.service.js';
import mediaService, { type MediaService } from '../media/media.service.js';
import notificationService, { type NotificationService } from '../notifications/notification.service.js';
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
    private readonly notifications: NotificationService = notificationService,
    private readonly collab: CollabRepository = collabRepository,
    private readonly media: MediaService = mediaService,
    private readonly cleanupJobs: CleanupQueue = cleanupQueue,
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

  private isHiddenForUser(conversation: { hiddenBy?: Array<string | Types.ObjectId> }, userId: string | Types.ObjectId) {
    return (conversation.hiddenBy || []).some((hiddenUserId) => hiddenUserId.toString() === userId.toString());
  }

  private getVisibleParticipantIds(conversation: { participants: Types.ObjectId[]; hiddenBy?: Types.ObjectId[] }, excludeUserId?: string) {
    const hiddenIds = new Set((conversation.hiddenBy || []).map((id) => id.toString()));

    return conversation.participants
      .map((id) => id.toString())
      .filter((id) => !hiddenIds.has(id) && id !== excludeUserId);
  }

  private getUnreadCount(conversation: { unreadCounts?: Map<string, number> }, userId: string | Types.ObjectId) {
    return Number(conversation.unreadCounts?.get(userId.toString()) || 0);
  }

  private setUnreadCount(conversation: { unreadCounts?: Map<string, number> }, userId: string | Types.ObjectId, count: number) {
    const unreadCounts = conversation.unreadCounts || new Map<string, number>();
    unreadCounts.set(userId.toString(), Math.max(0, count));
    conversation.unreadCounts = unreadCounts;
  }

  private getDefaultGroupName(users: Array<{ userName?: string }>) {
    const names = users.map((user) => user.userName).filter(Boolean).slice(0, 3);
    return names.length > 0 ? names.join(', ') : 'New Group';
  }

  private async getFormattedConversation(userId: string, conversationId: string | Types.ObjectId) {
    const conversations = await this.getConversations(userId);
    return conversations.find((conversation) => conversation._id?.toString() === conversationId.toString()) || null;
  }

  private ensureGroupAdmin(conversation: { admins?: Types.ObjectId[] }, userId: string) {
    const isAdmin = (conversation.admins || []).some((adminId) => adminId.toString() === userId.toString());
    if (!isAdmin) {
      throw new ForbiddenError('Only group admins can update this group.');
    }
  }

  private async createGroupSystemMessage(conversation: NonNullable<Awaited<ReturnType<ChatRepository['findConversationById']>>>, senderId: string, text: string) {
    const sender = await UserModel.findOne({ _id: senderId, active: { $ne: false } }).select('_id userName profilePicture headline').lean();
    const systemMessage = await this.chats.createMessage(
      conversation,
      {
        senderId,
        message: text,
        messageType: 'system',
      },
      {
        receiverId: null,
        unhideParticipants: false,
      },
    );
    const responseMessage = {
      ...systemMessage,
      senderInfo: sender,
      conversationIsUnread: true,
    };

    this.getVisibleParticipantIds(conversation, senderId).forEach((recipientId) => {
      this.realtime.emitToUser(recipientId, 'receive-message', responseMessage);
    });

    return responseMessage;
  }

  async saveMessage(input: SaveMessageInput, attachmentFile?: Express.Multer.File) {
    const messageType = input.messageType || (attachmentFile ? 'attachment' : input.isFeedback ? 'feedback' : input.sharedPostId || (input.postId && !input.feedbackOn) ? 'post' : 'text');
    const message = typeof input.message === 'string' && input.message.trim()
      ? input.message.trim()
      : messageType === 'attachment'
        ? 'Sent an attachment'
      : messageType === 'post'
        ? 'Shared a post'
        : '';

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

    const isExistingGroupConversation = Boolean(conversation?.isGroup);

    if (conversation && !this.isParticipant(conversation.participants, input.senderId)) {
      throw new ForbiddenError('You can only send messages in your conversations!');
    }

    if (conversation && isExistingGroupConversation && this.isHiddenForUser(conversation, input.senderId)) {
      throw new ForbiddenError('Accept the group invite before sending messages.');
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
    } else if (!isExistingGroupConversation) {
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

    if (messageType === 'post') {
      const sharedPostId = input.sharedPostId || input.postId;
      if (!sharedPostId) throw new BadRequestError('postId is required for post messages');

      const sharedPost = await this.posts.findVisibleActionTarget(sharedPostId);
      if (!sharedPost) throw new NotFoundError("Post doesn't exist!");
      await this.blockRules.ensureUsersCanInteract(input.senderId, sharedPost.user, 'share posts from');
      input.sharedPostId = sharedPostId;
      input.isFeedback = false;
    }

    if (messageType === 'attachment' && !attachmentFile) {
      throw new BadRequestError('Attachment is required!');
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

    const isGroupConversation = Boolean(conversation.isGroup);
    const recipientIds = isGroupConversation
      ? this.getVisibleParticipantIds(conversation, input.senderId)
      : receiverId
        ? [receiverId.toString()]
        : [];
    const attachment = attachmentFile
      ? await this.media.uploadChatAttachment(attachmentFile, input.senderId, conversation._id.toString())
      : undefined;
    const newMessage = await this.chats.createMessage(
      conversation,
      {
        ...input,
        message,
        messageType,
        attachment: attachment ? {
          url: attachment.url,
          fileId: attachment.fileId,
          filePath: attachment.filePath,
          name: attachment.name || attachmentFile?.originalname,
          mime: attachment.mime,
          size: attachment.size,
          mediaType: attachment.mediaType,
          thumbnailUrl: attachment.thumbnailUrl,
          width: attachment.width,
          height: attachment.height,
        } : undefined,
      },
      {
        receiverId: receiverId || null,
        unhideParticipants: !isGroupConversation,
        unreadRecipientIds: recipientIds,
      },
    );

    if (input.isFeedback) {
      const messageId = String((newMessage as unknown as { _id: unknown })._id);
      await Promise.all([
        this.heatmap.updateContribution(input.senderId, 'FEEDBACK', messageId, feedbackOwnerId),
        ...(input.feedbackOn === 'Post' && input.postId ? [this.posts.incrementFeedbacksCount(input.postId, 1)] : []),
      ]);
    }

    if (messageType === 'post' && input.sharedPostId) {
      await this.posts.incrementSharesCount(input.sharedPostId, 1);
    }

    const deliveredTo = await this.realtime.getOnlineUserIds(recipientIds);
    const responseMessage = {
      ...newMessage,
      senderInfo: sender,
      conversationIsUnread: true,
      deliveredTo,
    };

    recipientIds.forEach((recipientId) => {
      this.realtime.emitToUser(recipientId, 'receive-message', responseMessage);
    });

    return responseMessage;
  }

  async setConversationPinned(userId: string, conversationId: string, pinned: boolean) {
    const conversation = await this.chats.setPinnedForUser(conversationId, userId, pinned);

    if (!conversation) {
      throw new NotFoundError('Conversation not found!');
    }

    const formattedConversation = await this.getFormattedConversation(userId, conversation._id);

    return {
      conversation: formattedConversation,
    };
  }

  async startConversation(userId: string, receiverId: string) {
    if (userId.toString() === receiverId.toString()) {
      throw new BadRequestError('You cannot message yourself!');
    }

    const receiver = await UserModel.findOne({ _id: receiverId, active: { $ne: false } }).select('_id').lean();
    if (!receiver) {
      throw new NotFoundError('User not found!');
    }

    await this.blockRules.ensureUsersCanInteract(userId, receiverId, 'message');

    const conversation = await this.chats.startDirectConversation(userId, receiverId);
    const formattedConversation = await this.getFormattedConversation(userId, conversation._id);

    return {
      conversation: formattedConversation,
    };
  }

  async createGroup(userId: string, memberIdsInput: unknown, groupNameInput?: unknown) {
    const memberIds = Array.isArray(memberIdsInput)
      ? [...new Set(memberIdsInput.map((id) => String(id)).filter((id) => id && id !== userId))]
      : [];

    if (memberIds.length < 2) {
      throw new BadRequestError('Select at least two members to create a group.');
    }

    const [creator, members] = await Promise.all([
      UserModel.findOne({ _id: userId, active: { $ne: false } }).select('_id userName profilePicture headline').lean(),
      UserModel.find({ _id: { $in: memberIds }, active: { $ne: false } }).select('_id userName profilePicture headline').lean(),
    ]);

    if (!creator) {
      throw new NotFoundError('User not found!');
    }

    if (members.length !== memberIds.length) {
      throw new NotFoundError('One or more selected users are unavailable.');
    }

    await Promise.all(memberIds.map((memberId) => this.blockRules.ensureUsersCanInteract(userId, memberId, 'create a group with')));

    const groupName = typeof groupNameInput === 'string' && groupNameInput.trim()
      ? groupNameInput.trim().slice(0, 80)
      : this.getDefaultGroupName([creator, ...members]);
    const conversation = await this.chats.createGroupConversation({
      creatorId: userId,
      memberIds,
      groupName,
    });
    const room = await this.collab.createSharedRoom(conversation._id);

    await Promise.all(memberIds.map((recipientId) => this.notifications.send({
      senderId: userId,
      recipientId,
      type: 'GROUP_INVITE',
      contentId: conversation._id,
      onModel: 'Conversation',
    })));

    const formattedConversation = await this.getFormattedConversation(userId, conversation._id);

    return {
      conversation: formattedConversation,
      roomId: room._id,
    };
  }

  async acceptGroupInvite(userId: string, conversationId: string) {
    const conversation = await this.chats.findGroupConversationForUser(conversationId, userId);

    if (!conversation) {
      throw new NotFoundError('Group invite not found!');
    }

    const wasHidden = this.isHiddenForUser(conversation, userId);

    if (wasHidden) {
      conversation.hiddenBy = (conversation.hiddenBy || []).filter((id) => id.toString() !== userId.toString());
      await conversation.save();
    }

    const [room, user] = await Promise.all([
      this.collab.findRoomByConversation(conversation._id).then((existingRoom) => existingRoom || this.collab.createSharedRoom(conversation._id)),
      UserModel.findOne({ _id: userId, active: { $ne: false } }).select('_id userName profilePicture headline').lean(),
    ]);

    if (!user) {
      throw new NotFoundError('User not found!');
    }

    const notificationSenderId = conversation.createdBy || conversation.admins?.[0] || userId;
    await this.notifications.remove({
      senderId: notificationSenderId,
      recipientId: userId,
      type: 'GROUP_INVITE',
      contentId: conversation._id,
    });

    if (wasHidden) {
      const systemMessage = await this.chats.createMessage(
        conversation,
        {
          senderId: userId,
          message: `${user.userName || 'A member'} joined the group`,
          messageType: 'system',
        },
        {
          receiverId: null,
          unhideParticipants: false,
        },
      );
      const responseMessage = {
        ...systemMessage,
        senderInfo: user,
        conversationIsUnread: true,
      };

      this.getVisibleParticipantIds(conversation, userId).forEach((recipientId) => {
        this.realtime.emitToUser(recipientId, 'receive-message', responseMessage);
      });
    }

    const formattedConversation = await this.getFormattedConversation(userId, conversation._id);

    return {
      conversation: formattedConversation,
      roomId: room._id,
    };
  }

  async updateGroupDetails(userId: string, conversationId: string, groupNameInput: unknown) {
    const conversation = await this.chats.findGroupConversationForUser(conversationId, userId);

    if (!conversation || this.isHiddenForUser(conversation, userId)) {
      throw new NotFoundError('Group not found!');
    }

    this.ensureGroupAdmin(conversation, userId);

    const groupName = typeof groupNameInput === 'string' ? groupNameInput.trim().slice(0, 80) : '';
    if (!groupName) {
      throw new BadRequestError('Group name is required.');
    }

    conversation.groupName = groupName;
    await conversation.save();

    const formattedConversation = await this.getFormattedConversation(userId, conversation._id);

    return {
      conversation: formattedConversation,
    };
  }

  async inviteGroupMembers(userId: string, conversationId: string, memberIdsInput: unknown) {
    const conversation = await this.chats.findGroupConversationForUser(conversationId, userId);

    if (!conversation || this.isHiddenForUser(conversation, userId)) {
      throw new NotFoundError('Group not found!');
    }

    this.ensureGroupAdmin(conversation, userId);

    const existingParticipantIds = new Set(conversation.participants.map((id) => id.toString()));
    const memberIds = Array.isArray(memberIdsInput)
      ? [...new Set(memberIdsInput.map((id) => String(id)).filter((id) => id && id !== userId && !existingParticipantIds.has(id)))]
      : [];

    if (memberIds.length === 0) {
      throw new BadRequestError('Select at least one new member.');
    }

    const members = await UserModel.find({ _id: { $in: memberIds }, active: { $ne: false } }).select('_id userName').lean();
    if (members.length !== memberIds.length) {
      throw new NotFoundError('One or more selected users are unavailable.');
    }

    await Promise.all(memberIds.map((memberId) => this.blockRules.ensureUsersCanInteract(userId, memberId, 'invite to this group')));

    const hiddenSet = new Set((conversation.hiddenBy || []).map((id) => id.toString()));
    memberIds.forEach((memberId) => {
      conversation.participants.push(new Types.ObjectId(memberId));
      hiddenSet.add(memberId);
    });
    conversation.hiddenBy = Array.from(hiddenSet).map((id) => new Types.ObjectId(id));
    await conversation.save();

    await Promise.all(memberIds.map((recipientId) => this.notifications.send({
      senderId: userId,
      recipientId,
      type: 'GROUP_INVITE',
      contentId: conversation._id,
      onModel: 'Conversation',
    })));

    await this.createGroupSystemMessage(
      conversation,
      userId,
      `${members.map((member) => member.userName).filter(Boolean).join(', ')} invited to the group`,
    );

    const formattedConversation = await this.getFormattedConversation(userId, conversation._id);

    return {
      conversation: formattedConversation,
    };
  }

  async removeGroupMember(userId: string, conversationId: string, memberId: string) {
    const conversation = await this.chats.findGroupConversationForUser(conversationId, userId);

    if (!conversation || this.isHiddenForUser(conversation, userId)) {
      throw new NotFoundError('Group not found!');
    }

    if (!this.isParticipant(conversation.participants, memberId)) {
      throw new NotFoundError('Member not found in this group.');
    }

    const isSelfLeave = userId.toString() === memberId.toString();
    const isAdmin = (conversation.admins || []).some((adminId) => adminId.toString() === userId.toString());
    const visibleParticipantIds = this.getVisibleParticipantIds(conversation);

    if (isSelfLeave && isAdmin && visibleParticipantIds.length > 1) {
      throw new BadRequestError('Remove all members before leaving this group.');
    }

    if (!isSelfLeave) {
      this.ensureGroupAdmin(conversation, userId);
    }

    const hiddenSet = new Set((conversation.hiddenBy || []).map((id) => id.toString()));
    hiddenSet.add(memberId);
    conversation.hiddenBy = Array.from(hiddenSet).map((id) => new Types.ObjectId(id));
    conversation.admins = (conversation.admins || []).filter((adminId) => adminId.toString() !== memberId.toString());

    if ((conversation.admins || []).length === 0) {
      const nextAdminId = this.getVisibleParticipantIds(conversation, memberId)[0];
      if (nextAdminId) conversation.admins = [new Types.ObjectId(nextAdminId)];
    }

    await conversation.save();

    const targetUser = await UserModel.findById(memberId).select('userName').lean();
    await this.createGroupSystemMessage(
      conversation,
      userId,
      isSelfLeave
        ? `${targetUser?.userName || 'A member'} left the group`
        : `${targetUser?.userName || 'A member'} was removed from the group`,
    );

    const formattedConversation = isSelfLeave ? null : await this.getFormattedConversation(userId, conversation._id);

    return {
      conversation: formattedConversation,
      conversationId: conversation._id,
    };
  }

  async getConversations(userId: string) {
    const conversations = await this.chats.getConversations(userId);

    return Promise.all(conversations.map(async (conversation) => {
      if (conversation.isGroup) {
        const hiddenIds = new Set((conversation.hiddenBy || []).map((id: Types.ObjectId) => id.toString()));

        return {
          _id: conversation._id,
          isGroup: true,
          groupName: conversation.groupName,
          groupAvatar: conversation.groupAvatar,
          participants: (conversation.participantsInfo || []).filter((participant: { _id?: Types.ObjectId }) => (
            participant._id && !hiddenIds.has(participant._id.toString())
          )),
          admins: conversation.admins || [],
          roomId: conversation.roomId,
          lastMessage: conversation.lastMessage || null,
          isUnread: Number(conversation.unreadCount || 0) > 0,
          unreadCount: Number(conversation.unreadCount || 0),
          isPinned: Boolean(conversation.isPinned),
          updatedAt: conversation.updatedAt,
          isBlocked: false,
          hasBlockedMe: false,
          isUnavailable: false,
        };
      }

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
        isUnread: Number(conversation.unreadCount || 0) > 0,
        unreadCount: Number(conversation.unreadCount || 0),
        isPinned: Boolean(conversation.isPinned),
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

    const otherUserId = conversation.isGroup ? null : this.getOtherParticipant(conversation.participants, userId);
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

    const otherUserId = conversation.isGroup ? null : this.getOtherParticipant(conversation.participants, userId);
    if (otherUserId) {
      await this.blockRules.ensureUsersCanInteract(userId, otherUserId, 'mark messages from');
    }

    const lastMessage = conversation.lastMessage ? await this.chats.findMessageById(conversation.lastMessage as Types.ObjectId) : null;
    const lastMessageSenderId = lastMessage?.sender?.toString();
    const seenResult = await this.chats.markMessagesSeen(conversation._id, userId);
    this.setUnreadCount(conversation, userId, 0);

    if (lastMessageSenderId && lastMessageSenderId !== userId.toString() && conversation.isUnread) {
      conversation.isUnread = false;
    }

    await conversation.save();

    if (seenResult.count > 0) {
      conversation.participants
        .filter((participantId) => participantId.toString() !== userId.toString())
        .forEach((participantId) => {
          this.realtime.emitToUser(participantId.toString(), 'messages_seen', {
            conversationId: conversation._id,
            seenBy: userId,
            seenAt: seenResult.seenAt,
          });
        });
    }

    return {
      conversationId: conversation._id,
      unreadCount: this.getUnreadCount(conversation, userId),
      seenCount: seenResult.count,
      seenAt: seenResult.seenAt,
    };
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

    if (message.messageType === 'post' && message.sharedPost) {
      await this.posts.incrementSharesCount(message.sharedPost as Types.ObjectId, -1);
    }

    await this.chats.deleteMessage(message._id);

    let lastMessage: (Record<string, unknown> & { _id?: Types.ObjectId }) | null = null;

    if (wasLastMessage) {
      const latestMessage = await this.chats.findLatestMessage(conversation._id) as (Record<string, unknown> & { _id?: Types.ObjectId }) | null;
      lastMessage = latestMessage;
      conversation.lastMessage = latestMessage?._id || null;
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

    if (conversation.isGroup) {
      const visibleParticipantIds = this.getVisibleParticipantIds(conversation);
      const isAdmin = (conversation.admins || []).some((adminId) => adminId.toString() === userId.toString());

      if (isAdmin && visibleParticipantIds.length > 1) {
        throw new BadRequestError('Remove all members before deleting this group.');
      }

      if (isAdmin && visibleParticipantIds.length === 1) {
        await this.cleanupJobs.enqueueConversationCleanup({
          conversationId: conversation._id.toString(),
        });

        return {
          conversationId: conversation._id,
          hiddenForEveryone: true,
          deletedGroup: true,
        };
      }
    }

    const hiddenSet = new Set((conversation.hiddenBy || []).map((id) => id.toString()));
    hiddenSet.add(userId.toString());
    conversation.hiddenBy = [...hiddenSet].map((id) => new Types.ObjectId(id));
    this.setUnreadCount(conversation, userId, 0);
    await conversation.save();

    const participantIds = conversation.participants.map((id) => id.toString());
    const otherParticipantId = conversation.participants.find((id) => id.toString() !== userId.toString());
    const otherParticipant = otherParticipantId
      ? await UserModel.findById(otherParticipantId).select('active').lean()
      : null;
    const hiddenForEveryone = !otherParticipant || otherParticipant.active === false || participantIds.every((id) => hiddenSet.has(id));

    if (hiddenForEveryone) {
      await this.cleanupJobs.enqueueConversationCleanup({
        conversationId: conversation._id.toString(),
      });
    }

    return {
      conversationId: conversation._id,
      hiddenForEveryone,
    };
  }

  async getAttachmentAccess(userId: string, messageId: string, fileId: string) {
    const message = await this.chats.findMessageForAttachment(messageId, fileId);

    if (!message?.attachment?.url || !message.conversationId) {
      throw new NotFoundError('Attachment not found!');
    }

    const conversation = await this.chats.findConversationForUser(message.conversationId, userId);
    if (!conversation) {
      throw new ForbiddenError('You are not authorized to view this attachment.');
    }

    return {
      url: message.attachment.url,
      mime: message.attachment.mime,
      name: message.attachment.name,
    };
  }
}

const chatService = new ChatService();

export { ChatService };
export default chatService;
