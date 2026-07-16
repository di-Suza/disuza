import type { Types } from 'mongoose';

import FollowModel, { type FollowDocument } from './follow.model.js';

type PopulatedUser = {
  _id: Types.ObjectId;
  userName: string;
  profilePicture?: {
    url: string;
    fileId: string;
  };
  headline?: string;
};

type FollowListItem = {
  follower?: PopulatedUser;
  following?: PopulatedUser;
};

class FollowRepository {
  findOne(follower: string | Types.ObjectId, following: string | Types.ObjectId): Promise<FollowDocument | null> {
    return FollowModel.findOne({ follower, following });
  }

  exists(follower: string | Types.ObjectId, following: string | Types.ObjectId): Promise<{ _id: Types.ObjectId } | null> {
    return FollowModel.exists({ follower, following });
  }

  create(follower: string | Types.ObjectId, following: string | Types.ObjectId): Promise<FollowDocument> {
    return FollowModel.create({ follower, following });
  }

  deleteOne(follower: string | Types.ObjectId, following: string | Types.ObjectId): Promise<FollowDocument | null> {
    return FollowModel.findOneAndDelete({ follower, following });
  }

  deleteBetweenUsers(firstUserId: string | Types.ObjectId, secondUserId: string | Types.ObjectId) {
    return Promise.all([
      FollowModel.findOneAndDelete({ follower: firstUserId, following: secondUserId }),
      FollowModel.findOneAndDelete({ follower: secondUserId, following: firstUserId }),
    ]);
  }

  async getFollowers(userId: string | Types.ObjectId, excludedIds: Array<string | Types.ObjectId>, page: number, limit: number) {
    const query: Record<string, unknown> = { following: userId };

    if (excludedIds.length > 0) {
      query.follower = { $nin: excludedIds };
    }

    const follows = await FollowModel.find(query)
      .populate<{ follower: PopulatedUser }>('follower', 'userName profilePicture headline')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<FollowListItem[]>();

    return follows.map((item) => item.follower).filter(Boolean);
  }

  async getFollowing(userId: string | Types.ObjectId, excludedIds: Array<string | Types.ObjectId>, page: number, limit: number) {
    const query: Record<string, unknown> = { follower: userId };

    if (excludedIds.length > 0) {
      query.following = { $nin: excludedIds };
    }

    const follows = await FollowModel.find(query)
      .populate<{ following: PopulatedUser }>('following', 'userName profilePicture headline')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<FollowListItem[]>();

    return follows.map((item) => item.following).filter(Boolean);
  }


  findFollowingActivity(userId: string | Types.ObjectId, excludedIds: Array<string | Types.ObjectId>, page: number, limit: number, skipLimit = limit) {
    const query: Record<string, unknown> = { follower: userId };

    if (excludedIds.length > 0) {
      query.following = { $nin: excludedIds };
    }

    return FollowModel.find(query)
      .populate('following', 'userName profilePicture headline')
      .sort({ createdAt: -1 })
      .skip((page - 1) * skipLimit)
      .limit(limit)
      .lean();
  }
  findFollowingIds(userId: string | Types.ObjectId) {
    return FollowModel.find({ follower: userId }).select('following').lean();
  }

  findFollowerIds(userId: string | Types.ObjectId) {
    return FollowModel.find({ following: userId }).select('follower').lean();
  }

  findMutualRelations(userIds: string[], limit: number) {
    return FollowModel.find({
      $or: [
        { follower: { $in: userIds } },
        { following: { $in: userIds } },
      ],
    })
      .select('follower following')
      .limit(limit)
      .lean();
  }
}

const followRepository = new FollowRepository();

export { FollowRepository, type PopulatedUser };
export default followRepository;
