import type { Types } from 'mongoose';

import { BadRequestError, ForbiddenError } from '../../../shared/errors/index.js';
import blockRepository, { type BlockRepository } from './block.repository.js';

type BlockStatus = {
  isBlocked: boolean;
  hasBlockedMe: boolean;
  block: Awaited<ReturnType<BlockRepository['findBetweenUsers']>>;
};

class BlockService {
  constructor(private readonly repository: BlockRepository = blockRepository) {}

  async getBlockStatus(currentUserId: string | Types.ObjectId | null, targetUserId: string | Types.ObjectId | null): Promise<BlockStatus> {
    if (!currentUserId || !targetUserId) {
      return { isBlocked: false, hasBlockedMe: false, block: null };
    }

    const block = await this.repository.findBetweenUsers(currentUserId, targetUserId);

    if (!block) {
      return { isBlocked: false, hasBlockedMe: false, block: null };
    }

    const currentUserBlockedTarget = block.blocker.toString() === currentUserId.toString();

    return {
      isBlocked: currentUserBlockedTarget,
      hasBlockedMe: !currentUserBlockedTarget,
      block,
    };
  }

  async ensureUsersCanInteract(currentUserId: string | Types.ObjectId, targetUserId: string | Types.ObjectId, action = 'interact with') {
    if (!targetUserId) {
      throw new BadRequestError('Target user is required!');
    }

    if (currentUserId.toString() === targetUserId.toString()) return;

    const status = await this.getBlockStatus(currentUserId, targetUserId);

    if (!status.block) return;

    if (status.isBlocked) {
      throw new ForbiddenError(`You have blocked this user. Unblock them to ${action} them.`);
    }

    throw new ForbiddenError(`You can't ${action} this user.`);
  }

  async getBlockedUserIds(userId: string | Types.ObjectId) {
    const blockRelations = await this.repository.findRelationsForUser(userId);

    return blockRelations.map((block) => (
      block.blocker.toString() === userId.toString() ? block.blockedUser : block.blocker
    ));
  }
}

const blockService = new BlockService();

export { BlockService, type BlockStatus };
export default blockService;
