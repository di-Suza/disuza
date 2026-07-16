import mongoose, { type Types } from 'mongoose';

import CommentModel, { type Comment, type CommentDocument } from './comment.model.js';

type CreateCommentInput = Pick<Comment, 'comment' | 'post' | 'postOwner' | 'user' | 'parentComment' | 'replyToUser'>;

type PopulatedCommentUser = {
  _id: Types.ObjectId;
  userName: string;
  profilePicture?: {
    url?: string;
    fileId?: string;
  };
};

type CommentListItem = Omit<Comment, 'user' | 'post' | 'postOwner' | 'parentComment' | 'replyToUser'> & {
  _id: Types.ObjectId;
  post: Types.ObjectId;
  postOwner: Types.ObjectId;
  user: PopulatedCommentUser;
  parentComment: Types.ObjectId | null;
  replyToUser?: PopulatedCommentUser | null;
};

class CommentRepository {
  create(data: CreateCommentInput): Promise<CommentDocument> {
    return CommentModel.create(data);
  }

  findTopLevelById(commentId: string | Types.ObjectId, postId?: string | Types.ObjectId) {
    return CommentModel.findOne({
      _id: commentId,
      parentComment: null,
      ...(postId ? { post: postId } : {}),
    }).select('user post postOwner parentComment');
  }

  findByIdAndPost(commentId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<CommentDocument | null> {
    return CommentModel.findOne({ _id: commentId, post: postId });
  }

  findReplies(parentCommentId: string | Types.ObjectId) {
    return CommentModel.find({ parentComment: parentCommentId }).select('_id user').lean();
  }

  incrementReplyCount(commentId: string | Types.ObjectId, delta: number) {
    return CommentModel.findOneAndUpdate(
      { _id: commentId, ...(delta < 0 ? { replyCount: { $gt: 0 } } : {}) },
      { $inc: { replyCount: delta } },
      { new: true },
    );
  }

  deleteOne(commentId: string | Types.ObjectId) {
    return CommentModel.deleteOne({ _id: commentId });
  }

  deleteMany(commentIds: Array<string | Types.ObjectId>) {
    return CommentModel.deleteMany({ _id: { $in: commentIds } });
  }

  async populateAuthor(comment: CommentDocument): Promise<CommentDocument> {
    return comment.populate('user', 'profilePicture userName');
  }

  getTopLevelComments(postId: string | Types.ObjectId, currentUserId: string | Types.ObjectId, page: number, limit: number, blockedUserIds: Types.ObjectId[], isPostOwner: boolean) {
    const skip = (page - 1) * limit;
    const viewerObjectId = new mongoose.Types.ObjectId(currentUserId.toString());
    const matchStage: Record<string, unknown> = {
      post: new mongoose.Types.ObjectId(postId.toString()),
      $or: [{ parentComment: null }, { parentComment: { $exists: false } }],
    };

    if (blockedUserIds.length > 0) {
      matchStage.user = { $nin: blockedUserIds };
    }

    return CommentModel.aggregate<CommentListItem>([
      { $match: matchStage },
      {
        $addFields: {
          sortGroup: {
            $cond: [{ $and: [{ $eq: [isPostOwner, false] }, { $eq: ['$user', viewerObjectId] }] }, 0, 1],
          },
        },
      },
      { $sort: { sortGroup: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { userName: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: '$user' },
      { $project: { sortGroup: 0, __v: 0 } },
    ]);
  }

  findUserActivity(userId: string | Types.ObjectId, page: number, limit: number, skipLimit = limit) {
    return CommentModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * skipLimit)
      .limit(limit)
      .populate({ path: 'post', select: { media: { $slice: 1 }, caption: 1, _id: 1, user: 1 } })
      .populate({
        path: 'parentComment',
        select: 'comment user',
        populate: { path: 'user', select: 'userName profilePicture' },
      })
      .lean();
  }

  getReplies(parentCommentId: string | Types.ObjectId, page: number, limit: number, blockedUserIds: Types.ObjectId[]) {
    const skip = (page - 1) * limit;
    const matchStage: Record<string, unknown> = {
      parentComment: new mongoose.Types.ObjectId(parentCommentId.toString()),
    };

    if (blockedUserIds.length > 0) {
      matchStage.user = { $nin: blockedUserIds };
    }

    return CommentModel.aggregate<CommentListItem>([
      { $match: matchStage },
      { $sort: { createdAt: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { userName: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'users',
          localField: 'replyToUser',
          foreignField: '_id',
          as: 'replyToUser',
          pipeline: [{ $project: { userName: 1, profilePicture: 1 } }],
        },
      },
      {
        $unwind: {
          path: '$replyToUser',
          preserveNullAndEmptyArrays: true,
        },
      },
      { $project: { __v: 0 } },
    ]);
  }
}

const commentRepository = new CommentRepository();

export { CommentRepository, type CommentListItem, type CreateCommentInput };
export default commentRepository;
