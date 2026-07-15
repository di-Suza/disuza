import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/index.js';
import likeRepository, { type LikeRepository } from '../likes/like.repository.js';
import postRepository, { type PostRepository } from '../posts/post.repository.js';
import saveRepository, { type SaveRepository } from '../saves/save.repository.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import repostRepository, { type RepostAggregate, type RepostRepository } from './repost.repository.js';

type PopulatedRecord = Record<string, unknown>;

class RepostService {
  constructor(
    private readonly reposts: RepostRepository = repostRepository,
    private readonly posts: PostRepository = postRepository,
    private readonly blockRules: BlockService = blockService,
    private readonly likes: LikeRepository = likeRepository,
    private readonly saves: SaveRepository = saveRepository,
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown, fallback = 20, max = 30): number {
    const limit = Number(limitInput) || fallback;
    return Math.min(Math.max(limit, 1), max);
  }

  private getObjectId(value: unknown): string {
    if (typeof value === 'object' && value !== null && '_id' in value) {
      return String((value as { _id?: unknown })._id || '');
    }

    return String(value || '');
  }

  private getRepostUserId(repost: RepostAggregate): string {
    return this.getObjectId(repost.user);
  }

  private getRepostPost(repost: RepostAggregate): PopulatedRecord {
    return repost.post as PopulatedRecord;
  }

  private getPostId(repost: RepostAggregate): string {
    return this.getObjectId(this.getRepostPost(repost));
  }

  private getPostOwnerId(repost: RepostAggregate): string {
    return this.getObjectId(this.getRepostPost(repost).user);
  }

  private async attachPostState(currentUserId: string, reposts: RepostAggregate[]) {
    const postIds = reposts.map((repost) => this.getPostId(repost)).filter(Boolean);
    const [likedPostIds, savedPostIds, repostedPostIds] = await Promise.all([
      this.likes.findLikedPostIds(currentUserId, postIds),
      this.saves.findSavedPostIds(currentUserId, postIds),
      this.reposts.findRepostedPostIds(currentUserId, postIds),
    ]);

    return reposts.map((repost) => {
      const postId = this.getPostId(repost);
      const post = this.getRepostPost(repost);

      return {
        ...repost,
        post: {
          ...post,
          isLiked: likedPostIds.has(postId),
          isSaved: savedPostIds.has(postId),
          isReposted: repostedPostIds.has(postId),
        },
      };
    });
  }

  async repost(userId: string, postId: string) {
    const post = await this.posts.findVisibleActionTarget(postId);

    if (!post) {
      throw new NotFoundError("Post doesn't exist!");
    }

    if (post.user.toString() === userId.toString()) {
      throw new BadRequestError('You cannot repost your own post!');
    }

    await this.blockRules.ensureUsersCanInteract(userId, post.user, 'repost');

    const existingRepost = await this.reposts.exists(userId, postId);
    if (existingRepost) {
      throw new ConflictError('Post already reposted');
    }

    await this.reposts.create(userId, postId);
    await this.posts.incrementRepostsCount(postId, 1);

    return { reposted: true };
  }

  async unrepost(userId: string, postId: string) {
    const deletedRepost = await this.reposts.delete(userId, postId);

    if (!deletedRepost) {
      return { reposted: false, alreadyUnreposted: true };
    }

    await this.posts.incrementRepostsCount(postId, -1);

    return { reposted: false, alreadyUnreposted: false };
  }

  async getUserReposts(currentUserId: string, userId: string, pageInput: unknown, limitInput: unknown) {
    await this.blockRules.ensureUsersCanInteract(currentUserId, userId, 'view reposts from');

    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput);
    const blockedUserIds = await this.blockRules.getBlockedUserIds(currentUserId);
    const reposts = await this.reposts.findVisibleUserReposts(userId, blockedUserIds, page, limit);
    const enrichedReposts = await this.attachPostState(currentUserId, reposts);

    return {
      reposts: enrichedReposts,
      page,
      hasMore: reposts.length === limit,
    };
  }

  async getRepost(currentUserId: string, repostId: string) {
    const blockedUserIds = await this.blockRules.getBlockedUserIds(currentUserId);
    const repost = await this.reposts.findVisibleById(repostId, blockedUserIds);

    if (!repost) {
      throw new NotFoundError("Repost doesn't exist!");
    }

    await Promise.all([
      this.blockRules.ensureUsersCanInteract(currentUserId, this.getRepostUserId(repost), 'view reposts from'),
      this.blockRules.ensureUsersCanInteract(currentUserId, this.getPostOwnerId(repost), 'view posts from'),
    ]);

    const [enrichedRepost] = await this.attachPostState(currentUserId, [repost]);

    return enrichedRepost;
  }
}

const repostService = new RepostService();

export { RepostService };
export default repostService;
