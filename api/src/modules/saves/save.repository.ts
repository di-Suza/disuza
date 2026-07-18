import mongoose, { type Types } from 'mongoose';

import { visiblePostQuery } from '../posts/post.repository.js';
import SaveModel, { type SaveDocument } from './save.model.js';

type SavedPostAggregate = {
  _id: Types.ObjectId;
  collectionId: Types.ObjectId;
  post: {
    _id: Types.ObjectId;
    caption?: string;
    media?: unknown[];
    counts?: unknown;
    settings?: unknown;
    isProjectPost?: boolean;
    projectLinks?: unknown;
    createdAt?: Date;
    updatedAt?: Date;
    user?: unknown;
  };
  createdAt: Date;
};

class SaveRepository {
  findByUserAndPost(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<SaveDocument | null> {
    return SaveModel.findOne({ user: userId, post: postId });
  }

  exists(userId: string | Types.ObjectId, postId: string | Types.ObjectId) {
    return SaveModel.exists({ user: userId, post: postId });
  }

  create(userId: string | Types.ObjectId, postId: string | Types.ObjectId, collectionId: string | Types.ObjectId) {
    return SaveModel.create({ user: userId, post: postId, collectionId });
  }

  updateCollection(saveId: string | Types.ObjectId, collectionId: string | Types.ObjectId) {
    return SaveModel.updateOne({ _id: saveId }, { collectionId });
  }

  upsertCollection(userId: string | Types.ObjectId, postId: string | Types.ObjectId, collectionId: string | Types.ObjectId) {
    return SaveModel.findOneAndUpdate(
      { user: userId, post: postId },
      { $set: { collectionId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  deleteByUserAndPost(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<SaveDocument | null> {
    return SaveModel.findOneAndDelete({ user: userId, post: postId });
  }

  deleteManyByCollection(userId: string | Types.ObjectId, collectionId: string | Types.ObjectId) {
    return SaveModel.deleteMany({ user: userId, collectionId });
  }

  findLatestInCollection(userId: string | Types.ObjectId, collectionId: string | Types.ObjectId) {
    return SaveModel.findOne({ user: userId, collectionId }).sort({ createdAt: -1 }).lean();
  }

  async findSavedPostIds(userId: string | Types.ObjectId, postIds: Array<string | Types.ObjectId>) {
    if (postIds.length === 0) return new Set<string>();

    const saves = await SaveModel.find({ user: userId, post: { $in: postIds } }).select('post').lean();

    return new Set(saves.map((save) => save.post.toString()));
  }

  countVisibleByCollections(userId: string | Types.ObjectId, collectionIds: Types.ObjectId[], blockedUserIds: Types.ObjectId[]) {
    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId.toString()),
          collectionId: { $in: collectionIds },
        },
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'post',
          foreignField: '_id',
          as: 'post',
          pipeline: [
            { $match: visiblePostQuery },
            { $project: { user: 1 } },
          ],
        },
      },
      { $unwind: '$post' },
    ];

    if (blockedUserIds.length > 0) {
      pipeline.push({ $match: { 'post.user': { $nin: blockedUserIds } } });
    }

    pipeline.push({ $group: { _id: '$collectionId', postsCount: { $sum: 1 } } });

    return SaveModel.aggregate<{ _id: Types.ObjectId; postsCount: number }>(pipeline);
  }

  findVisibleCollectionPosts(
    userId: string | Types.ObjectId,
    collectionId: string | Types.ObjectId,
    blockedUserIds: Types.ObjectId[],
    skip: number,
    limit: number,
  ) {
    const saveMatch = {
      user: new mongoose.Types.ObjectId(userId.toString()),
      collectionId: new mongoose.Types.ObjectId(collectionId.toString()),
    };
    const postVisibilityMatch = blockedUserIds.length > 0 ? { 'post.user': { $nin: blockedUserIds } } : {};
    const aggregateBase: mongoose.PipelineStage[] = [
      { $match: saveMatch },
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
                createdAt: 1,
                updatedAt: 1,
                user: 1,
              },
            },
          ],
        },
      },
      { $unwind: '$post' },
      { $match: postVisibilityMatch },
    ];

    return Promise.all([
      SaveModel.aggregate<SavedPostAggregate>([
        ...aggregateBase,
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'post.user',
            foreignField: '_id',
            as: 'post.user',
            pipeline: [{ $project: { userName: 1, headline: 1, profilePicture: 1 } }],
          },
        },
        {
          $unwind: {
            path: '$post.user',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]),
      SaveModel.aggregate<{ totalPosts: number }>([...aggregateBase, { $count: 'totalPosts' }]),
    ]);
  }
}

const saveRepository = new SaveRepository();

export { SaveRepository, type SavedPostAggregate };
export default saveRepository;