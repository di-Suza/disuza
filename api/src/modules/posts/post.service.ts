import mongoose, { type FilterQuery } from 'mongoose';

import { BadRequestError, NotFoundError } from '../../shared/errors/index.js';
import mediaService, { type MediaService } from '../media/media.service.js';
import type { StoredMedia } from '../media/media.types.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import followRepository, { type FollowRepository } from '../users/follow/follow.repository.js';
import userRepository, { type UserRepository } from '../users/user.repository.js';
import type { Post, PostMedia, PostSettings, ProjectLinks } from './post.model.js';
import postRepository, { type PostRepository } from './post.repository.js';

type MediaOrderItem = {
  source?: 'existing' | 'upload' | 'new';
  fileId?: string;
  uploadIndex?: number;
};

type ExistingMediaInput = Partial<PostMedia> & {
  fileId: string;
  url?: string;
};

type CreatePostInput = {
  caption?: string;
  settings?: Partial<PostSettings>;
  isProjectPost?: boolean;
  projectLinks?: ProjectLinks;
  mediaOrder?: MediaOrderItem[];
};

type UpdatePostInput = {
  caption?: string;
  settings?: Partial<PostSettings>;
  projectLinks?: ProjectLinks;
  mediaOrder?: MediaOrderItem[];
  media?: ExistingMediaInput[];
  images?: ExistingMediaInput[];
};

type DeletePostResult = {
  deleted: boolean;
  alreadyDeleting: boolean;
};

class PostService {
  constructor(
    private readonly posts: PostRepository = postRepository,
    private readonly users: UserRepository = userRepository,
    private readonly follows: FollowRepository = followRepository,
    private readonly blockRules: BlockService = blockService,
    private readonly media: MediaService = mediaService,
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown, fallback: number, max: number): number {
    const limit = Number(limitInput) || fallback;
    return Math.min(Math.max(limit, 1), max);
  }

  private normalizeCaption(caption: unknown): string {
    return typeof caption === 'string' ? caption.trim() : '';
  }

  private normalizeSettings(settings?: Partial<PostSettings>): PostSettings {
    return {
      hideLikesCount: Boolean(settings?.hideLikesCount),
      commentsDisabled: Boolean(settings?.commentsDisabled),
    };
  }

  private normalizeProjectLinks(isProjectPost: boolean, projectLinks?: ProjectLinks): ProjectLinks | undefined {
    if (!isProjectPost) return undefined;

    const liveDemoUrl = projectLinks?.liveDemoUrl?.trim();
    const repositoryUrl = projectLinks?.repositoryUrl?.trim();

    if (!liveDemoUrl || !repositoryUrl) {
      throw new BadRequestError('Project post cannot be created without URLs!');
    }

    return { liveDemoUrl, repositoryUrl };
  }

  private toPostMedia(media: StoredMedia, order: number): PostMedia {
    return {
      url: media.url,
      fileId: media.fileId,
      mediaType: media.mediaType,
      order,
      filePath: media.filePath,
      name: media.name,
      thumbnailUrl: media.thumbnailUrl,
      width: media.width,
      height: media.height,
      size: media.size,
      mime: media.mime,
    };
  }

  private normalizeMediaOrder(media: PostMedia[]): PostMedia[] {
    if (media.length === 0) {
      throw new BadRequestError('Post cannot be saved without media!');
    }

    return media.map((item, index) => ({ ...item, order: index }));
  }

  private buildCreateMedia(uploadedMedia: StoredMedia[], mediaOrder?: MediaOrderItem[]): PostMedia[] {
    if (uploadedMedia.length === 0) {
      throw new BadRequestError('Post cannot be created without media!');
    }

    if (!mediaOrder?.length) {
      return this.normalizeMediaOrder(uploadedMedia.map((media, index) => this.toPostMedia(media, index)));
    }

    const usedUploadIndexes = new Set<number>();
    const orderedMedia = mediaOrder.map((orderItem, order) => {
      const uploadIndex = Number(orderItem.uploadIndex);
      const source = orderItem.source || 'upload';

      if (source === 'existing') {
        throw new BadRequestError('Create post mediaOrder cannot reference existing media.');
      }

      if (!Number.isInteger(uploadIndex) || uploadIndex < 0 || uploadIndex >= uploadedMedia.length) {
        throw new BadRequestError('Invalid media order upload index.');
      }

      if (usedUploadIndexes.has(uploadIndex)) {
        throw new BadRequestError('Duplicate media order upload index.');
      }

      usedUploadIndexes.add(uploadIndex);
      return this.toPostMedia(uploadedMedia[uploadIndex], order);
    });

    if (usedUploadIndexes.size !== uploadedMedia.length) {
      throw new BadRequestError('Media order must include every uploaded media item.');
    }

    return this.normalizeMediaOrder(orderedMedia);
  }

  private existingMediaFromBody(postMedia: PostMedia[], requestedMedia?: ExistingMediaInput[]): PostMedia[] | null {
    if (!requestedMedia) return null;

    const existingMediaByFileId = new Map(postMedia.map((media) => [media.fileId, media]));

    const usedFileIds = new Set<string>();

    return requestedMedia.map((mediaItem, order) => {
      const existingMedia = existingMediaByFileId.get(mediaItem.fileId);

      if (!existingMedia) {
        throw new BadRequestError('Existing media item does not belong to this post.');
      }

      if (usedFileIds.has(mediaItem.fileId)) {
        throw new BadRequestError('Duplicate existing media item in request.');
      }

      usedFileIds.add(mediaItem.fileId);
      return { ...existingMedia, order };
    });
  }

  private buildUpdateMedia(postMedia: PostMedia[], uploadedMedia: StoredMedia[], input: UpdatePostInput): PostMedia[] {
    const existingMediaByFileId = new Map(postMedia.map((media) => [media.fileId, media]));

    if (input.mediaOrder?.length) {
      const usedExistingFileIds = new Set<string>();
      const usedUploadIndexes = new Set<number>();

      const orderedMedia = input.mediaOrder.map((orderItem, order) => {
        const source = orderItem.source || (orderItem.fileId ? 'existing' : 'upload');

        if (source === 'existing') {
          if (!orderItem.fileId) {
            throw new BadRequestError('Existing media order item requires fileId.');
          }

          const existingMedia = existingMediaByFileId.get(orderItem.fileId);

          if (!existingMedia) {
            throw new BadRequestError('Existing media item does not belong to this post.');
          }

          if (usedExistingFileIds.has(orderItem.fileId)) {
            throw new BadRequestError('Duplicate existing media item in order.');
          }

          usedExistingFileIds.add(orderItem.fileId);
          return { ...existingMedia, order };
        }

        const uploadIndex = Number(orderItem.uploadIndex);

        if (!Number.isInteger(uploadIndex) || uploadIndex < 0 || uploadIndex >= uploadedMedia.length) {
          throw new BadRequestError('Invalid media order upload index.');
        }

        if (usedUploadIndexes.has(uploadIndex)) {
          throw new BadRequestError('Duplicate uploaded media item in order.');
        }

        usedUploadIndexes.add(uploadIndex);
        return this.toPostMedia(uploadedMedia[uploadIndex], order);
      });

      if (usedUploadIndexes.size !== uploadedMedia.length) {
        throw new BadRequestError('Media order must include every uploaded media item.');
      }

      return this.normalizeMediaOrder(orderedMedia);
    }

    const requestedExistingMedia = this.existingMediaFromBody(postMedia, input.media || input.images);
    const baseMedia = requestedExistingMedia || postMedia;
    const appendedMedia = uploadedMedia.map((media, index) => this.toPostMedia(media, baseMedia.length + index));

    return this.normalizeMediaOrder([...baseMedia, ...appendedMedia]);
  }

  private async cleanupUploadedMedia(uploadedMedia: StoredMedia[]): Promise<void> {
    await Promise.all(uploadedMedia.map((media) => this.media.tryDeleteFile(media.fileId)));
  }

  private async cleanupRemovedMedia(previousMedia: PostMedia[], nextMedia: PostMedia[]): Promise<void> {
    const nextFileIds = new Set(nextMedia.map((media) => media.fileId));
    const removedMedia = previousMedia.filter((media) => !nextFileIds.has(media.fileId));

    await Promise.all(removedMedia.map((media) => this.media.tryDeleteFile(media.fileId)));
  }

  async createPost(userId: string, input: CreatePostInput, files: Express.Multer.File[]) {
    const postId = new mongoose.Types.ObjectId();
    const isProjectPost = Boolean(input.isProjectPost);
    const projectLinks = this.normalizeProjectLinks(isProjectPost, input.projectLinks);
    const uploadedMedia = await this.media.uploadPostMedia(files, userId, postId.toString());

    try {
      const media = this.buildCreateMedia(uploadedMedia, input.mediaOrder);
      const post = await this.posts.create({
        _id: postId,
        user: userId,
        caption: this.normalizeCaption(input.caption),
        media,
        settings: this.normalizeSettings(input.settings),
        isProjectPost,
        projectLinks,
      });

      await Promise.all([
        this.users.incrementCounter(userId, 'postsCount', 1),
        ...(isProjectPost ? [this.users.incrementCounter(userId, 'projectsCount', 1)] : []),
      ]);

      return post;
    } catch (error) {
      await this.cleanupUploadedMedia(uploadedMedia);
      throw error;
    }
  }

  async getDashboardPosts(userId: string, pageInput: unknown, limitInput: unknown) {
    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput, 10, 30);
    const posts = await this.posts.findDashboardPosts(userId, page, limit);

    return {
      posts,
      page,
      hasMore: posts.length === limit,
    };
  }

  async getPost(currentUserId: string, postId: string) {
    const post = await this.posts.findVisibleById(postId);

    if (!post) {
      throw new NotFoundError("Post doesn't exist!");
    }

    const ownerId = String((post.user as unknown as { _id?: unknown })._id || post.user);
    await this.blockRules.ensureUsersCanInteract(currentUserId, ownerId, 'view posts from');

    return {
      ...post.toObject(),
      isLiked: false,
      isSaved: false,
    };
  }

  async updatePost(userId: string, postId: string, input: UpdatePostInput, files: Express.Multer.File[]) {
    const post = await this.posts.findOwnedVisibleById(postId, userId);

    if (!post) {
      throw new NotFoundError("Post doesn't exist!");
    }

    const previousMedia = post.toObject().media;
    const uploadedMedia = files.length > 0 ? await this.media.uploadPostMedia(files, userId, postId) : [];
    const updateData: {
      caption?: string;
      media?: PostMedia[];
      settings?: PostSettings;
      projectLinks?: ProjectLinks;
    } = {};

    let updatedPost;

    try {
      if (typeof input.caption === 'string') {
        updateData.caption = this.normalizeCaption(input.caption);
      }

      if (input.settings) {
        updateData.settings = this.normalizeSettings(input.settings);
      }

      if (post.isProjectPost) {
        if (input.projectLinks) {
          updateData.projectLinks = this.normalizeProjectLinks(true, input.projectLinks);
        }
      } else if (input.projectLinks) {
        throw new BadRequestError("It's not a Project Post, You can't add links now!");
      }

      if (input.mediaOrder?.length || input.media || input.images || uploadedMedia.length > 0) {
        updateData.media = this.buildUpdateMedia(previousMedia, uploadedMedia, input);
      }

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestError('Please provide post data to update.');
      }

      updatedPost = await this.posts.updateById(postId, updateData);
    } catch (error) {
      await this.cleanupUploadedMedia(uploadedMedia);
      throw error;
    }

    if (!updatedPost) {
      await this.cleanupUploadedMedia(uploadedMedia);
      throw new NotFoundError("Post doesn't exist!");
    }

    if (updateData.media) {
      await this.cleanupRemovedMedia(previousMedia, updateData.media);
    }

    return updatedPost;
  }

  async deletePost(userId: string, postId: string): Promise<DeletePostResult> {
    const post = await this.posts.findOwnedVisibleById(postId, userId);

    if (!post) {
      const deletingPost = await this.posts.markDeleting(postId, userId);

      if (deletingPost?.isDeleting) {
        return { deleted: true, alreadyDeleting: true };
      }

      throw new NotFoundError("Post not found or you're not authorized to delete this post!");
    }

    const deletedPost = await this.posts.markDeleting(postId, userId);

    if (!deletedPost) {
      throw new NotFoundError("Post not found or you're not authorized to delete this post!");
    }

    await Promise.all([
      this.users.incrementCounter(userId, 'postsCount', -1),
      ...(post.isProjectPost ? [this.users.incrementCounter(userId, 'projectsCount', -1)] : []),
      ...post.media.map((mediaItem) => this.media.tryDeleteFile(mediaItem.fileId)),
    ]);

    return { deleted: true, alreadyDeleting: false };
  }

  async getFeed(userId: string, pageInput: unknown, limitInput: unknown, typeInput: unknown) {
    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput, 10, 30);
    const type = typeInput === 'following' ? 'following' : 'all';
    const blockedUserIds = await this.blockRules.getBlockedUserIds(userId);
    const filter: FilterQuery<Post> = {};

    if (type === 'following') {
      const followingRelations = await this.follows.findFollowingIds(userId);
      const blockedUserIdSet = new Set(blockedUserIds.map((id) => id.toString()));
      const followedUserIds = followingRelations
        .map((relation) => relation.following)
        .filter((id) => !blockedUserIdSet.has(id.toString()));

      if (followedUserIds.length === 0) {
        return { posts: [], page, hasMore: false };
      }

      filter.user = { $in: followedUserIds };
    } else if (blockedUserIds.length > 0) {
      filter.user = { $nin: blockedUserIds };
    }

    const posts = await this.posts.findFeedPosts(filter, page, limit);

    return {
      posts: posts.map((post) => ({ ...post, isLiked: false, isSaved: false })),
      page,
      hasMore: posts.length === limit,
    };
  }
}

const postService = new PostService();

export { PostService, type CreatePostInput, type MediaOrderItem, type UpdatePostInput };
export default postService;
