import mongoose, { type Types } from 'mongoose';

import { visiblePostQuery } from '../posts/post.repository.js';
import RepostModel, { type RepostDocument } from './repost.model.js';

type RepostAggregate = {
  _id: Types.ObjectId;
  user: unknown;
  post: unknown;
  createdAt: Date;
  updatedAt: Date;
};

class RepostRepository {
  exists(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<RepostDocument | null> {
    return RepostModel.findOne({ user: userId, post: postId });
  }

  create(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<RepostDocument> {
    return RepostModel.create({ user: userId, post: postId });
  }

  delete(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<RepostDocument | null> {
    return RepostModel.findOneAndDelete({ user: userId, post: postId });
  }

  async findRepostedPostIds(userId: string | Types.ObjectId, postIds: Array<string | Types.ObjectId>) {
    const reposts = await RepostModel.find({ user: userId, post: { $in: postIds } }).select('post').lean();
    return new Set(reposts.map((repost) => repost.post.toString()));
  }

  findPostReposts(postId: string | Types.ObjectId, page: number, limit: number) {
    return RepostModel.find({ post: postId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'userName profilePicture headline')
      .lean();
  }

  findVisibleUserReposts(
    userId: string | Types.ObjectId,
    blockedUserIds: Types.ObjectId[],
    page: number,
    limit: number,
  ) {
    const originalAuthorVisibility = blockedUserIds.length > 0 ? { 'post.user': { $nin: blockedUserIds } } : {};

    return RepostModel.aggregate<RepostAggregate>([
      { $match: { user: new mongoose.Types.ObjectId(userId.toString()) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'posts',
          localField: 'post',
          foreignField: '_id',
          as: 'post',
          pipeline: [
            { $match: visiblePostQuery },
            {
              $project: {
                caption: 1,
                media: { $slice: ['$media', 1] },
                counts: 1,
                settings: 1,
                isProjectPost: 1,
                projectLinks: 1,
                links: 1,
                codeSnippet: 1,
                hashtags: 1,
                createdAt: 1,
                updatedAt: 1,
                user: 1,
              },
            },
          ],
        },
      },
      { $unwind: '$post' },
      { $match: originalAuthorVisibility },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { userName: 1, headline: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'users',
          localField: 'post.user',
          foreignField: '_id',
          as: 'post.user',
          pipeline: [{ $project: { userName: 1, headline: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: '$post.user' },
    ]);
  }

  findVisibleById(repostId: string | Types.ObjectId, blockedUserIds: Types.ObjectId[]) {
    const originalAuthorVisibility = blockedUserIds.length > 0 ? { 'post.user': { $nin: blockedUserIds } } : {};

    return RepostModel.aggregate<RepostAggregate>([
      { $match: { _id: new mongoose.Types.ObjectId(repostId.toString()) } },
      {
        $lookup: {
          from: 'posts',
          localField: 'post',
          foreignField: '_id',
          as: 'post',
          pipeline: [{ $match: visiblePostQuery }],
        },
      },
      { $unwind: '$post' },
      { $match: originalAuthorVisibility },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { userName: 1, headline: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'users',
          localField: 'post.user',
          foreignField: '_id',
          as: 'post.user',
          pipeline: [{ $project: { userName: 1, headline: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: '$post.user' },
      { $limit: 1 },
    ]).then((reposts) => reposts[0] || null);
  }

  deleteManyByPost(postId: string | Types.ObjectId) {
    return RepostModel.deleteMany({ post: postId });
  }

  countReceivedByDay(userId: string | Types.ObjectId, startDate: Date) {
    return RepostModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $lookup: {
          from: 'posts',
          localField: 'post',
          foreignField: '_id',
          as: 'post',
          pipeline: [
            {
              $match: {
                user: new mongoose.Types.ObjectId(userId.toString()),
                ...visiblePostQuery,
              },
            },
            { $project: { _id: 1 } },
          ],
        },
      },
      { $match: { 'post.0': { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}

const repostRepository = new RepostRepository();

export { RepostRepository, type RepostAggregate };
export default repostRepository;
