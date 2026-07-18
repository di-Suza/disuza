import type { Types } from 'mongoose';

import { ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
import blockService, { type BlockService, type BlockStatus } from '../users/block/block.service.js';
import collabRepository, { type CollabRepository } from './collab.repository.js';

const PERSONAL_ROOM = 'personal';
const SHARED_ROOM = 'shared';

function isSameId(firstId?: string | Types.ObjectId | null, secondId?: string | Types.ObjectId | null): boolean {
  return firstId?.toString() === secondId?.toString();
}

type RoomAccess = {
  room: NonNullable<Awaited<ReturnType<CollabRepository['findRoomById']>>>;
  conversation?: NonNullable<Awaited<ReturnType<CollabRepository['findConversationById']>>>;
  roomType: typeof PERSONAL_ROOM | typeof SHARED_ROOM;
  accessMode: typeof PERSONAL_ROOM | typeof SHARED_ROOM | 'solo_due_to_block';
  canAccess: true;
  canUseRealtime: boolean;
  otherUserId: Types.ObjectId | null;
  blockStatus: BlockStatus | null;
};

class CollabRoomAccessService {
  constructor(
    private readonly collab: CollabRepository = collabRepository,
    private readonly blockRules: BlockService = blockService,
  ) {}

  async getRoomAccess(userId: string | Types.ObjectId, roomId: string | Types.ObjectId): Promise<RoomAccess> {
    const room = await this.collab.findRoomById(roomId);

    if (!room) {
      throw new NotFoundError('Collaboration room not found');
    }

    if (room.roomType === PERSONAL_ROOM) {
      if (!isSameId(room.owner, userId)) {
        throw new ForbiddenError("Room not found or you're not authorized");
      }

      return {
        room,
        roomType: PERSONAL_ROOM,
        accessMode: PERSONAL_ROOM,
        canAccess: true,
        canUseRealtime: false,
        otherUserId: null,
        blockStatus: null,
      };
    }

    const conversation = await this.collab.findConversationById(room.conversationId);

    if (!conversation) {
      throw new NotFoundError('Room conversation not found');
    }

    const isParticipant = conversation.participants.some((participantId) => isSameId(participantId, userId));
    const hasAcceptedAccess = !(conversation.hiddenBy || []).some((hiddenUserId) => isSameId(hiddenUserId, userId));

    if (!isParticipant || !hasAcceptedAccess) {
      throw new ForbiddenError("Room not found or you're not authorized");
    }

    if (conversation.isGroup) {
      return {
        room,
        conversation,
        roomType: SHARED_ROOM,
        accessMode: SHARED_ROOM,
        canAccess: true,
        canUseRealtime: true,
        otherUserId: null,
        blockStatus: null,
      };
    }

    const otherUserId = conversation.participants.find((participantId) => !isSameId(participantId, userId)) || null;

    if (!otherUserId) {
      throw new NotFoundError('Room partner not found');
    }

    const blockStatus = await this.blockRules.getBlockStatus(userId, otherUserId);

    if (blockStatus.isBlocked) {
      throw new ForbiddenError('You have blocked this user. Unblock them to access this room.');
    }

    return {
      room,
      conversation,
      roomType: SHARED_ROOM,
      accessMode: blockStatus.hasBlockedMe ? 'solo_due_to_block' : SHARED_ROOM,
      canAccess: true,
      canUseRealtime: !blockStatus.block,
      otherUserId,
      blockStatus,
    };
  }

  async getRealtimeAccess(userId: string | Types.ObjectId, roomId: string | Types.ObjectId): Promise<boolean> {
    const access = await this.getRoomAccess(userId, roomId);
    return access.canUseRealtime;
  }
}

const collabRoomAccessService = new CollabRoomAccessService();

export { CollabRoomAccessService, type RoomAccess };
export default collabRoomAccessService;
