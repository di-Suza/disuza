import type { Types } from 'mongoose';

import LikeModel from './like.model.js';

const isDuplicateKeyError = (error: unknown): boolean => (
  typeof error === 'object'
  && error !== null
  && 'code' in error
  && Number((error as { code?: unknown }).code) === 11000
);

class LikeRepository {
  async createOnce(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<{ created: boolean }> {
    try {
      await LikeModel.create({ user: userId, post: postId });
      return { created: true };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return { created: false };
      }

      throw error;
    }
  }

  async deleteOne(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<{ deleted: boolean }> {
    const deletedLike = await LikeModel.findOneAndDelete({ user: userId, post: postId });

    return { deleted: Boolean(deletedLike) };
  }

  async exists(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<boolean> {
    const like = await LikeModel.exists({ user: userId, post: postId });

    return Boolean(like);
  }


  async findUserActivity(userId: string | Types.ObjectId, page: number, limit: number, skipLimit = limit) {
    return LikeModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * skipLimit)
      .limit(limit)
      .populate({
        path: 'post',
        select: { caption: 1, media: { $slice: 1 }, user: 1, createdAt: 1 },
      })
      .lean();
  }
  async findLikedPostIds(userId: string | Types.ObjectId, postIds: Array<string | Types.ObjectId>): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();

    const likes = await LikeModel.find({ user: userId, post: { $in: postIds } })
      .select('post')
      .lean();

    return new Set(likes.map((like) => like.post.toString()));
  }
}

const likeRepository = new LikeRepository();

export { LikeRepository };
export default likeRepository;
