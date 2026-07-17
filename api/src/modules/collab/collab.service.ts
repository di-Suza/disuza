import type { Types } from 'mongoose';

import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
import notificationService, { type NotificationService } from '../notifications/notification.service.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import collabRepository, { type CollabRepository, type ConversationWithOtherUser } from './collab.repository.js';
import collabRoomAccessService, { type CollabRoomAccessService } from './collabRoomAccess.service.js';

const DELETED_USER_PROFILE = {
  url: 'https://ik.imagekit.io/disuza/DevloopFeed/ProfilePictures/defaultpp.jpg',
  fileId: '0',
};

function getDeletedUserFallback(userId: string | Types.ObjectId) {
  return {
    _id: userId,
    userName: 'User',
    profilePicture: DELETED_USER_PROFILE,
    isDeletedUser: true,
  };
}

class CollabService {
  constructor(
    private readonly collab: CollabRepository = collabRepository,
    private readonly notifications: NotificationService = notificationService,
    private readonly blockRules: BlockService = blockService,
    private readonly roomAccess: CollabRoomAccessService = collabRoomAccessService,
  ) {}

  private isSameId(firstId?: string | Types.ObjectId | null, secondId?: string | Types.ObjectId | null): boolean {
    return firstId?.toString() === secondId?.toString();
  }

  private async getConversationParticipantIds(conversationId: string, userId: string) {
    const conversation = await this.collab.findConversationById(conversationId);

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const isParticipant = conversation.participants.some((id) => this.isSameId(id, userId));
    const hasAcceptedAccess = !(conversation.hiddenBy || []).some((id) => this.isSameId(id, userId));

    if (!isParticipant || !hasAcceptedAccess) {
      throw new ForbiddenError("You're not authorized for this conversation");
    }

    if (conversation.isGroup) {
      return { conversation, otherUserId: null };
    }

    const otherUserId = conversation.participants.find((id) => !this.isSameId(id, userId));

    if (!otherUserId) {
      throw new NotFoundError('Recipient not found');
    }

    return { conversation, otherUserId };
  }

  async checkCollabRequestStatus(senderId: string, conversationId: string) {
    const { conversation, otherUserId } = await this.getConversationParticipantIds(conversationId, senderId);

    if (conversation.isGroup) {
      const existingRoom = await this.collab.findRoomByConversation(conversationId);
      if (existingRoom) {
        return {
          status: 'accepted',
          roomId: existingRoom._id,
          acceptedNotificationId: null,
          message: 'Active',
        };
      }

      const room = await this.collab.createSharedRoom(conversationId);
      return {
        status: 'accepted',
        roomId: room._id,
        acceptedNotificationId: null,
        message: 'Active',
      };
    }

    if (!otherUserId) {
      throw new NotFoundError('Recipient not found');
    }

    const blockStatus = await this.blockRules.getBlockStatus(senderId, otherUserId);

    if (blockStatus.block) {
      return {
        status: 'blocked',
        isBlocked: blockStatus.isBlocked,
        hasBlockedMe: blockStatus.hasBlockedMe,
        message: 'Collaboration unavailable',
      };
    }

    const existingRoom = await this.collab.findRoomByConversation(conversationId);
    if (existingRoom) {
      const acceptedNotification = await this.notifications.findOne({
        recipient: senderId,
        type: 'COLLAB_ACCEPTED',
        contentId: existingRoom._id,
      });

      return {
        status: 'accepted',
        roomId: existingRoom._id,
        acceptedNotificationId: acceptedNotification?._id || null,
        message: 'Active',
      };
    }

    const pendingRequest = await this.collab.findRequestByConversation(conversationId);
    if (pendingRequest) {
      const isSender = pendingRequest.sender.toString() === senderId.toString();

      return {
        status: 'pending',
        role: isSender ? 'sender' : 'recipient',
        requestId: pendingRequest._id,
        message: isSender ? 'Request Sent' : 'Request Received',
      };
    }

    return { status: 'none', message: 'No active collaboration' };
  }

  async sendCollabRequest(senderId: string, conversationId: string) {
    const existingRequest = await this.collab.findRequestByConversation(conversationId);
    if (existingRequest) {
      throw new BadRequestError('Request already pending');
    }

    const { conversation, otherUserId: recipientId } = await this.getConversationParticipantIds(conversationId, senderId);

    if (conversation.isGroup) {
      throw new BadRequestError('Group rooms are available without a collab request.');
    }

    if (!recipientId) {
      throw new NotFoundError('Recipient not found');
    }

    await this.blockRules.ensureUsersCanInteract(senderId, recipientId, 'collaborate with');

    const request = await this.collab.createRequest(senderId, recipientId, conversationId);

    await this.notifications.send({
      senderId,
      recipientId,
      type: 'COLLAB_REQUEST',
      contentId: request._id,
      onModel: 'CollabRequest',
    });

    return request;
  }

  async acceptCollabRequest(senderId: string, conversationId: string) {
    const request = await this.collab.findRequestByConversation(conversationId);
    const existingRoom = await this.collab.findRoomByConversation(conversationId);

    if (!request) {
      if (existingRoom) return existingRoom;
      throw new NotFoundError('Request expired or not found');
    }

    if (request.recipient.toString() !== senderId.toString()) {
      throw new ForbiddenError('You are not authorized to accept this request');
    }

    await this.blockRules.ensureUsersCanInteract(senderId, request.sender, 'collaborate with');

    const room = existingRoom || await this.collab.createSharedRoom(conversationId);

    await this.collab.deleteRequestById(request._id);
    await this.notifications.remove({
      senderId: request.sender,
      recipientId: request.recipient,
      type: 'COLLAB_REQUEST',
      contentId: request._id,
    });

    if (!existingRoom) {
      await this.notifications.send({
        senderId,
        recipientId: request.sender,
        type: 'COLLAB_ACCEPTED',
        contentId: room._id,
        onModel: 'CollabRoom',
      });
    }

    return room;
  }

  async getCollabRoom(userId: string, roomId: string) {
    const access = await this.roomAccess.getRoomAccess(userId, roomId);
    const populateOptions = access.roomType === 'personal'
      ? [
        {
          path: 'owner',
          select: 'userName profilePicture.url',
        },
        {
          path: 'currentlySelectedProblem',
          populate: {
            path: 'problemId',
            model: 'Problem',
          },
        },
      ]
      : [
        {
          path: 'conversationId',
          select: 'participants hiddenBy isGroup groupName groupAvatar admins',
          populate: {
            path: 'participants',
            model: 'User',
            select: 'userName profilePicture.url',
          },
        },
        {
          path: 'currentlySelectedProblem',
          populate: {
            path: 'problemId',
            model: 'Problem',
          },
        },
      ];

    const room = await this.collab.findPopulatedRoom(roomId, populateOptions);

    if (!room) {
      throw new NotFoundError('Collaboration room not found');
    }

    const roomProblems = await this.collab.findRoomProblems(roomId);
    const roomDetails = room.toObject() as Record<string, unknown>;

    if (access.roomType === 'shared' && access.otherUserId) {
      const conversationDetails = roomDetails.conversationId as { participants?: Array<Record<string, unknown>> } | undefined;
      const participants = conversationDetails?.participants || [];
      const hasOtherParticipant = participants.some((participant) => participant?._id?.toString() === access.otherUserId?.toString());

      if (!hasOtherParticipant) {
        participants.push(getDeletedUserFallback(access.otherUserId));
        roomDetails.conversationId = {
          ...(conversationDetails || {}),
          participants,
        };
      }
    }

    if (access.roomType === 'shared' && !access.otherUserId) {
      const conversationDetails = roomDetails.conversationId as { participants?: Array<Record<string, unknown>>; hiddenBy?: Array<Types.ObjectId> } | undefined;
      const hiddenIds = new Set((conversationDetails?.hiddenBy || []).map((id) => id.toString()));
      if (conversationDetails?.participants) {
        conversationDetails.participants = conversationDetails.participants.filter((participant) => (
          participant?._id && !hiddenIds.has(participant._id.toString())
        ));
      }
    }

    roomDetails.accessMode = access.accessMode;
    roomDetails.realtimeDisabled = !access.canUseRealtime;
    roomDetails.roomType = access.roomType;

    return {
      roomDetails,
      problems: roomProblems || [],
    };
  }

  getOrCreatePersonalRoom(userId: string) {
    return this.collab.getOrCreatePersonalRoom(userId);
  }

  async getMyRooms(userId: string) {
    const personalRoom = await this.collab.getOrCreatePersonalRoom(userId);
    const conversations = await this.collab.findUserConversationsWithOtherUser(userId);
    const conversationIds = conversations.map((conversation) => conversation._id);
    const conversationMap = new Map(conversations.map((conversation) => [conversation._id.toString(), conversation]));
    const sharedRooms = await this.collab.findSharedRoomsByConversationIds(conversationIds);
    const allRoomIds = [personalRoom._id, ...sharedRooms.map((room) => room._id)];
    const stats = await this.collab.aggregateRoomStats(allRoomIds);
    const statsMap = new Map(stats.map((item) => [item._id.toString(), item]));

    const formattedRooms: Array<Record<string, unknown>> = [
      {
        _id: personalRoom._id,
        roomType: 'personal',
        accessMode: 'personal',
        realtimeDisabled: true,
        title: 'Personal Coding Room',
        subtitle: 'Your private DSA workspace',
        updatedAt: personalRoom.updatedAt,
        problemsCount: statsMap.get(personalRoom._id.toString())?.problemsCount || 0,
        solvedCount: statsMap.get(personalRoom._id.toString())?.solvedCount || 0,
      },
    ];

    for (const room of sharedRooms) {
      const conversation = conversationMap.get(room.conversationId.toString());
      if (!conversation) continue;

      if (conversation.isGroup) {
        const roomStats = statsMap.get(room._id.toString());
        formattedRooms.push({
          _id: room._id,
          roomType: 'shared',
          accessMode: 'shared',
          realtimeDisabled: false,
          title: conversation.groupName || 'Group Room',
          subtitle: `${conversation.participantsInfo?.length || conversation.participants.length} members`,
          participants: conversation.participantsInfo || [],
          currentlySelectedProblem: room.currentlySelectedProblem,
          updatedAt: room.updatedAt,
          problemsCount: roomStats?.problemsCount || 0,
          solvedCount: roomStats?.solvedCount || 0,
        });
        continue;
      }

      const otherUser = this.getRoomOtherUser(conversation);
      if (!otherUser?._id) continue;

      const blockStatus = 'isDeletedUser' in otherUser
        ? { isBlocked: false, hasBlockedMe: false, block: null }
        : await this.blockRules.getBlockStatus(userId, otherUser._id);

      if (blockStatus.isBlocked) continue;

      const roomStats = statsMap.get(room._id.toString());
      formattedRooms.push({
        _id: room._id,
        roomType: 'shared',
        accessMode: blockStatus.hasBlockedMe ? 'solo_due_to_block' : 'shared',
        realtimeDisabled: Boolean(blockStatus.block),
        title: otherUser.userName,
        subtitle: blockStatus.hasBlockedMe
          ? 'Solo access until this user unblocks you'
          : 'Shared coding room',
        otherUser,
        currentlySelectedProblem: room.currentlySelectedProblem,
        updatedAt: room.updatedAt,
        problemsCount: roomStats?.problemsCount || 0,
        solvedCount: roomStats?.solvedCount || 0,
      });
    }

    return {
      rooms: formattedRooms,
    };
  }

  private getRoomOtherUser(conversation: ConversationWithOtherUser) {
    if (conversation.otherUser && conversation.otherUser.active !== false) {
      return conversation.otherUser;
    }

    if (!conversation.otherUserId) return null;

    return getDeletedUserFallback(conversation.otherUserId);
  }
}

const collabService = new CollabService();

export { CollabService };
export default collabService;
