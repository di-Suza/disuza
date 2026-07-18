import type { Types } from 'mongoose';

import likeRepository, { type LikeRepository } from '../likes/like.repository.js';
import saveRepository, { type SaveRepository } from '../saves/save.repository.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import searchRepository, { type SearchRepository } from './search.repository.js';

const DEFAULT_SEARCH_LIMIT = 10;
const DEFAULT_DISCOVER_LIMIT = 8;
const MAX_LIMIT = 20;

class SearchService {
  constructor(
    private readonly searches: SearchRepository = searchRepository,
    private readonly blockRules: BlockService = blockService,
    private readonly likes: LikeRepository = likeRepository,
    private readonly saves: SaveRepository = saveRepository,
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown, fallback: number): number {
    const limit = Number(limitInput) || fallback;
    return Math.min(Math.max(limit, 1), MAX_LIMIT);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private toSearchRegex(query: unknown): RegExp {
    const normalizedQuery = typeof query === 'string' ? query.trim().replace(/^#/, '') : '';
    return new RegExp(this.escapeRegex(normalizedQuery), 'i');
  }

  private async addViewerState(userId: string, posts: Array<{ _id: Types.ObjectId } & Record<string, unknown>>) {
    const postIds = posts.map((post) => post._id);
    const [likedPostIds, savedPostIds] = await Promise.all([
      this.likes.findLikedPostIds(userId, postIds),
      this.saves.findSavedPostIds(userId, postIds),
    ]);

    return posts.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post._id.toString()),
      isSaved: savedPostIds.has(post._id.toString()),
    }));
  }

  async search(userId: string, query: unknown, options: { userPage?: unknown; postPage?: unknown; limit?: unknown } = {}) {
    const userPage = this.normalizePage(options.userPage);
    const postPage = this.normalizePage(options.postPage);
    const limit = this.normalizeLimit(options.limit, DEFAULT_SEARCH_LIMIT);
    const searchRegex = this.toSearchRegex(query);
    const blockedUserIds = await this.blockRules.getBlockedUserIds(userId);

    const [matchedUsers, matchedPosts, totalUsers, totalPosts] = await Promise.all([
      this.searches.findUsers(searchRegex, blockedUserIds, userPage, limit),
      this.searches.findPosts(searchRegex, blockedUserIds, postPage, limit),
      this.searches.countUsers(searchRegex, blockedUserIds),
      this.searches.countPosts(searchRegex, blockedUserIds),
    ]);

    return {
      matchedUsers,
      matchedPosts: await this.addViewerState(userId, matchedPosts),
      totalUsers,
      totalPosts,
      hasMoreUsers: userPage * limit < totalUsers,
      hasMorePosts: postPage * limit < totalPosts,
      userPage,
      postPage,
    };
  }

  async discover(userId: string, options: { page?: unknown; limit?: unknown } = {}) {
    const page = this.normalizePage(options.page);
    const limit = this.normalizeLimit(options.limit, DEFAULT_DISCOVER_LIMIT);
    const blockedUserIds = await this.blockRules.getBlockedUserIds(userId);

    const [topContributors, trendingPosts, totalTrendingPosts] = await Promise.all([
      this.searches.findTopContributors(blockedUserIds),
      this.searches.findTrendingPosts(blockedUserIds, page, limit),
      this.searches.countTrendingPosts(blockedUserIds),
    ]);

    return {
      topContributors,
      trendingPosts: await this.addViewerState(userId, trendingPosts),
      hasMoreTrendingPosts: page * limit < totalTrendingPosts,
      totalTrendingPosts,
      page,
    };
  }
}

const searchService = new SearchService();

export { SearchService };
export default searchService;
