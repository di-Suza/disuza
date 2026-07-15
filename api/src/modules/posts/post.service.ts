import mongoose, { type FilterQuery } from 'mongoose';

import logger from '../../config/logger.js';
import cleanupQueue, { type CleanupQueue } from '../../infrastructure/jobs/cleanup.queue.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/index.js';
import heatmapService, { type HeatmapService } from '../contributions/heatmap.service.js';
import mediaService, { type MediaService } from '../media/media.service.js';
import type { StoredMedia } from '../media/media.types.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import likeRepository, { type LikeRepository } from '../likes/like.repository.js';
import saveRepository, { type SaveRepository } from '../saves/save.repository.js';
import followRepository, { type FollowRepository } from '../users/follow/follow.repository.js';
import userRepository, { type UserRepository } from '../users/user.repository.js';
import repostRepository, { type RepostRepository } from '../reposts/repost.repository.js';
import type { CodeSnippet, Post, PostLink, PostMedia, PostSettings, ProjectLinks } from './post.model.js';
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
  links?: Partial<PostLink>[];
  codeSnippet?: Partial<CodeSnippet>;
  hashtags?: string[];
  mediaOrder?: MediaOrderItem[];
};

type UpdatePostInput = {
  caption?: string;
  settings?: Partial<PostSettings>;
  projectLinks?: ProjectLinks;
  links?: Partial<PostLink>[];
  codeSnippet?: Partial<CodeSnippet>;
  hashtags?: string[];
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
    private readonly likes: LikeRepository = likeRepository,
    private readonly saves: SaveRepository = saveRepository,
    private readonly reposts: RepostRepository = repostRepository,
    private readonly follows: FollowRepository = followRepository,
    private readonly blockRules: BlockService = blockService,
    private readonly media: MediaService = mediaService,
    private readonly heatmap: HeatmapService = heatmapService,
    private readonly cleanupJobs: CleanupQueue = cleanupQueue,
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

  private ensureHttpUrl(url: string, field: string): string {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Unsupported protocol');
      }
      return parsedUrl.toString();
    } catch {
      throw new BadRequestError(`${field} must be a valid http(s) URL.`);
    }
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

    return {
      liveDemoUrl: this.ensureHttpUrl(liveDemoUrl, 'Live demo URL'),
      repositoryUrl: this.ensureHttpUrl(repositoryUrl, 'Repository URL'),
    };
  }

  private normalizeLinks(links?: Partial<PostLink>[]): PostLink[] {
    if (!Array.isArray(links)) return [];

    return links
      .map((link) => ({
        label: typeof link.label === 'string' ? link.label.trim() : '',
        url: typeof link.url === 'string' ? link.url.trim() : '',
      }))
      .filter((link) => link.label || link.url)
      .map((link) => {
        if (!link.label || !link.url) {
          throw new BadRequestError('Link label and URL are required together.');
        }

        return {
          label: link.label.slice(0, 80),
          url: this.ensureHttpUrl(link.url, 'Link URL'),
        };
      })
      .slice(0, 8);
  }

  private normalizeCodeSnippet(codeSnippet?: Partial<CodeSnippet>): CodeSnippet | undefined {
    const code = typeof codeSnippet?.code === 'string' ? codeSnippet.code.trim() : '';
    if (!code) return undefined;

    const language = typeof codeSnippet?.language === 'string' && codeSnippet.language.trim()
      ? codeSnippet.language.trim().slice(0, 40)
      : 'text';

    return {
      language,
      code: code.slice(0, 8000),
    };
  }

  private extractCaptionHashtags(caption: string): string[] {
    return Array.from(caption.matchAll(/#([a-zA-Z0-9_]{1,40})/g)).map((match) => match[1]);
  }

  private normalizeHashtags(hashtags?: string[], caption = ''): string[] {
    const seenTags = new Set<string>();
    const rawTags = [
      ...(Array.isArray(hashtags) ? hashtags : []),
      ...this.extractCaptionHashtags(caption),
    ];

    return rawTags
      .map((tag) => (typeof tag === 'string' ? tag.replace(/^#/, '').trim().toLowerCase() : ''))
      .filter((tag) => {
        if (!tag || seenTags.has(tag)) return false;
        seenTags.add(tag);
        return true;
      })
      .slice(0, 12);
  }

  private hasPostContent(input: {
    caption?: string;
    media?: PostMedia[];
    links?: PostLink[];
    codeSnippet?: CodeSnippet;
    hashtags?: string[];
    projectLinks?: ProjectLinks;
  }): boolean {
    return Boolean(
      input.caption?.trim()
      || input.media?.length
      || input.links?.length
      || input.codeSnippet?.code?.trim()
      || input.hashtags?.length
      || input.projectLinks?.liveDemoUrl
      || input.projectLinks?.repositoryUrl,
    );
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
    return media.map((item, index) => ({ ...item, order: index }));
  }

  private buildCreateMedia(uploadedMedia: StoredMedia[], mediaOrder?: MediaOrderItem[]): PostMedia[] {
    if (uploadedMedia.length === 0) {
      if (mediaOrder?.length) {
        throw new BadRequestError('Media order cannot be provided without uploaded media.');
      }

      return [];
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
    const caption = this.normalizeCaption(input.caption);
    const links = this.normalizeLinks(input.links);
    const codeSnippet = this.normalizeCodeSnippet(input.codeSnippet);
    const hashtags = this.normalizeHashtags(input.hashtags, caption);
    const uploadedMedia = await this.media.uploadPostMedia(files, userId, postId.toString());

    try {
      const media = this.buildCreateMedia(uploadedMedia, input.mediaOrder);

      if (!this.hasPostContent({ caption, media, links, codeSnippet, hashtags, projectLinks })) {
        throw new BadRequestError('Post must include text, media, code, links, hashtags, or project links.');
      }

      const post = await this.posts.create({
        _id: postId,
        user: userId,
        caption,
        media,
        settings: this.normalizeSettings(input.settings),
        isProjectPost,
        projectLinks,
        links,
        codeSnippet,
        hashtags,
      });

      await Promise.all([
        this.users.incrementCounter(userId, 'postsCount', 1),
        this.heatmap.updateContribution(userId, 'POST', post._id),
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
    const [post, isLiked, isSaved, isReposted] = await Promise.all([
      this.posts.findVisibleById(postId),
      this.likes.exists(currentUserId, postId),
      this.saves.exists(currentUserId, postId),
      this.reposts.exists(currentUserId, postId),
    ]);

    if (!post) {
      throw new NotFoundError("Post doesn't exist!");
    }

    const ownerId = String((post.user as unknown as { _id?: unknown })._id || post.user);
    await this.blockRules.ensureUsersCanInteract(currentUserId, ownerId, 'view posts from');

    return {
      ...post.toObject(),
      isLiked: Boolean(isLiked),
      isSaved: Boolean(isSaved),
      isReposted: Boolean(isReposted),
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
      links?: PostLink[];
      codeSnippet?: CodeSnippet;
      hashtags?: string[];
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

      if (input.links) {
        updateData.links = this.normalizeLinks(input.links);
      }

      if (Object.prototype.hasOwnProperty.call(input, 'codeSnippet')) {
        updateData.codeSnippet = this.normalizeCodeSnippet(input.codeSnippet);
      }

      if (input.hashtags) {
        updateData.hashtags = this.normalizeHashtags(input.hashtags, updateData.caption ?? post.caption);
      } else if (typeof updateData.caption === 'string') {
        updateData.hashtags = this.normalizeHashtags(undefined, updateData.caption);
      }

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestError('Please provide post data to update.');
      }

      const nextContent = {
        caption: updateData.caption ?? post.caption,
        media: updateData.media ?? previousMedia,
        links: updateData.links ?? post.links,
        codeSnippet: updateData.codeSnippet ?? post.codeSnippet,
        hashtags: updateData.hashtags ?? post.hashtags,
        projectLinks: updateData.projectLinks ?? post.projectLinks,
      };

      if (!this.hasPostContent(nextContent)) {
        throw new BadRequestError('Post must include text, media, code, links, hashtags, or project links.');
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

    try {
      await this.cleanupJobs.enqueuePostCleanup({
        postId: post._id.toString(),
        userId: userId.toString(),
      });
    } catch (error) {
      logger.warn({ error, postId: post._id.toString(), userId: userId.toString() }, 'Post cleanup job enqueue failed');
    }

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
    const postIds = posts.map((post) => post._id);
    const [likedPostIds, savedPostIds, repostedPostIds] = await Promise.all([
      this.likes.findLikedPostIds(userId, postIds),
      this.saves.findSavedPostIds(userId, postIds),
      this.reposts.findRepostedPostIds(userId, postIds),
    ]);

    return {
      posts: posts.map((post) => ({
        ...post,
        isLiked: likedPostIds.has(post._id.toString()),
        isSaved: savedPostIds.has(post._id.toString()),
        isReposted: repostedPostIds.has(post._id.toString()),
      })),
      page,
      hasMore: posts.length === limit,
    };
  }
}

const postService = new PostService();

export { PostService, type CreatePostInput, type MediaOrderItem, type UpdatePostInput };
export default postService;
