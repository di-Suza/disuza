import type { FilterQuery, Types } from 'mongoose';

import PostModel, {
  type CodeSnippet,
  type Post,
  type PostDocument,
  type PostLink,
  type PostMedia,
  type PostSettings,
  type ProjectLinks,
} from './post.model.js';

type CreatePostInput = {
  _id: Types.ObjectId;
  user: string | Types.ObjectId;
  caption: string;
  media: PostMedia[];
  settings: PostSettings;
  isProjectPost: boolean;
  projectLinks?: ProjectLinks;
  links?: PostLink[];
  codeSnippet?: CodeSnippet;
  hashtags?: string[];
};

type UpdatePostInput = Partial<Pick<Post, 'caption' | 'media' | 'settings' | 'projectLinks' | 'links' | 'codeSnippet' | 'hashtags'>>;

const visiblePostQuery = { isDeleting: { $ne: true } } as const;

class PostRepository {
  create(data: CreatePostInput): Promise<PostDocument> {
    return PostModel.create(data);
  }

  findOwnedVisibleById(postId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<PostDocument | null> {
    return PostModel.findOne({ _id: postId, user: userId, ...visiblePostQuery });
  }

  findVisibleById(postId: string | Types.ObjectId): Promise<PostDocument | null> {
    return PostModel.findOne({ _id: postId, ...visiblePostQuery }).populate('user', 'profilePicture userName headline');
  }

  findVisibleActionTarget(postId: string | Types.ObjectId) {
    return PostModel.findOne({ _id: postId, ...visiblePostQuery })
      .select('user')
      .lean();
  }

  findVisibleCommentTarget(postId: string | Types.ObjectId) {
    return PostModel.findOne({ _id: postId, ...visiblePostQuery })
      .select('user settings')
      .lean();
  }

  incrementCommentsCount(postId: string | Types.ObjectId, delta: number) {
    return PostModel.findOneAndUpdate(
      { _id: postId, ...visiblePostQuery, ...(delta < 0 ? { 'counts.comments': { $gt: 0 } } : {}) },
      { $inc: { 'counts.comments': delta } },
      { new: true },
    );
  }

  findVisibleSaveTarget(postId: string | Types.ObjectId) {
    return PostModel.findOne({ _id: postId, ...visiblePostQuery })
      .select({ user: 1, media: { $slice: 1 } })
      .lean();
  }

  findVisibleCoverMedia(postId: string | Types.ObjectId) {
    return PostModel.findOne({ _id: postId, ...visiblePostQuery })
      .select({ media: { $slice: 1 } })
      .lean();
  }

  incrementLikesCount(postId: string | Types.ObjectId, delta: number) {
    return PostModel.findOneAndUpdate(
      { _id: postId, ...visiblePostQuery, ...(delta < 0 ? { 'counts.likes': { $gt: 0 } } : {}) },
      { $inc: { 'counts.likes': delta } },
      { new: true },
    );
  }

  incrementFeedbacksCount(postId: string | Types.ObjectId, delta: number) {
    return PostModel.findOneAndUpdate(
      { _id: postId, ...visiblePostQuery, ...(delta < 0 ? { 'counts.feedbacks': { $gt: 0 } } : {}) },
      { $inc: { 'counts.feedbacks': delta } },
      { new: true },
    );
  }

  incrementRepostsCount(postId: string | Types.ObjectId, delta: number) {
    return PostModel.findOneAndUpdate(
      { _id: postId, ...visiblePostQuery, ...(delta < 0 ? { 'counts.reposts': { $gt: 0 } } : {}) },
      { $inc: { 'counts.reposts': delta } },
      { new: true },
    );
  }

  markUserPostsDeleting(userId: string | Types.ObjectId) {
    return PostModel.updateMany(
      { user: userId, isDeleting: { $ne: true } },
      { isDeleting: true, deletedAt: new Date() },
    );
  }

  findDashboardPosts(userId: string | Types.ObjectId, page: number, limit: number) {
    return PostModel.find({ user: userId, ...visiblePostQuery })
      .sort({ createdAt: -1 })
      .select({ settings: 0, user: 0, media: { $slice: 1 } })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  findProfilePosts(userId: string | Types.ObjectId) {
    return PostModel.find({ user: userId, ...visiblePostQuery })
      .select({ settings: 0, user: 0, counts: 0, media: { $slice: 1 } })
      .sort({ createdAt: -1 })
      .lean();
  }

  updateById(postId: string | Types.ObjectId, data: UpdatePostInput): Promise<PostDocument | null> {
    return PostModel.findOneAndUpdate(
      { _id: postId, ...visiblePostQuery },
      { $set: data },
      { new: true, runValidators: true },
    ).populate('user', 'profilePicture userName headline');
  }

  markDeleting(postId: string | Types.ObjectId, userId: string | Types.ObjectId) {
    return PostModel.findOneAndUpdate(
      { _id: postId, user: userId },
      { isDeleting: true, deletedAt: new Date() },
      { new: true },
    );
  }

  restoreDeleting(postId: string | Types.ObjectId, userId: string | Types.ObjectId) {
    return PostModel.updateOne(
      { _id: postId, user: userId, isDeleting: true },
      { $set: { isDeleting: false, deletedAt: null } },
    );
  }

  findFeedPosts(filter: FilterQuery<Post>, page: number, limit: number) {
    return PostModel.find({ ...filter, ...visiblePostQuery })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'userName profilePicture headline')
      .lean();
  }
}

const postRepository = new PostRepository();

export { PostRepository, type CreatePostInput, type UpdatePostInput, visiblePostQuery };
export default postRepository;
