import type { Types } from 'mongoose';

import BlockModel, { type BlockDocument } from './block.model.js';

type BlockedUserListItem = {
  _id: Types.ObjectId;
  blockedUser?: {
    _id: Types.ObjectId;
    userName: string;
    profilePicture?: {
      url: string;
      fileId: string;
    };
    headline?: string;
  };
};

class BlockRepository {
  findBetweenUsers(firstUserId: string | Types.ObjectId, secondUserId: string | Types.ObjectId): Promise<BlockDocument | null> {
    return BlockModel.findOne({
      $or: [
        { blocker: firstUserId, blockedUser: secondUserId },
        { blocker: secondUserId, blockedUser: firstUserId },
      ],
    });
  }

  findOne(blocker: string | Types.ObjectId, blockedUser: string | Types.ObjectId): Promise<BlockDocument | null> {
    return BlockModel.findOne({ blocker, blockedUser });
  }

  create(blocker: string | Types.ObjectId, blockedUser: string | Types.ObjectId): Promise<BlockDocument> {
    return BlockModel.create({ blocker, blockedUser });
  }

  deleteOne(blocker: string | Types.ObjectId, blockedUser: string | Types.ObjectId): Promise<BlockDocument | null> {
    return BlockModel.findOneAndDelete({ blocker, blockedUser });
  }

  findRelationsForUser(userId: string | Types.ObjectId) {
    return BlockModel.find({
      $or: [{ blocker: userId }, { blockedUser: userId }],
    })
      .select('blocker blockedUser')
      .lean();
  }

  async getBlockedUsers(userId: string | Types.ObjectId, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [blockedUsers, totalBlockedUsers] = await Promise.all([
      BlockModel.find({ blocker: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ blockedUser: BlockedUserListItem['blockedUser'] }>('blockedUser', 'userName profilePicture headline')
        .lean<BlockedUserListItem[]>(),
      BlockModel.countDocuments({ blocker: userId }),
    ]);

    return {
      blockedUsers,
      totalBlockedUsers,
    };
  }
}

const blockRepository = new BlockRepository();

export { BlockRepository };
export default blockRepository;
