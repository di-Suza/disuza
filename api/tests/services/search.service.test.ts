import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SearchService } from '../../src/modules/search/search.service.js';
import { oid, postId, thirdUserId, userId } from '../helpers/domain.js';

describe('SearchService', () => {
  it('returns search results with escaped query, pagination, viewer state, and blocked-user filters', async () => {
    const postObjectId = oid(postId);
    const service = new SearchService({
      findUsers: async () => [{ _id: oid(thirdUserId) }],
      findPosts: async () => [{ _id: postObjectId, caption: 'React' }],
      countUsers: async () => 2,
      countPosts: async () => 2,
    } as never, {
      getBlockedUserIds: async () => [oid(thirdUserId)],
    } as never, {
      findLikedPostIds: async () => new Set([postId]),
    } as never, {
      findSavedPostIds: async () => new Set([postId]),
    } as never);

    const results = await service.search(userId, '#react.*', { userPage: '-2', postPage: '1', limit: '1' });

    assert.equal(results.userPage, 1);
    assert.equal(results.hasMoreUsers, true);
    assert.equal(results.matchedPosts[0].isLiked, true);
    assert.equal(results.matchedPosts[0].isSaved, true);
  });

  it('builds discover results with top contributors and trending post state', async () => {
    const postObjectId = oid(postId);
    const service = new SearchService({
      findTopContributors: async () => [{ _id: oid(thirdUserId) }],
      findTrendingPosts: async () => [{ _id: postObjectId, caption: 'Trending' }],
      countTrendingPosts: async () => 2,
    } as never, {
      getBlockedUserIds: async () => [oid(thirdUserId)],
    } as never, {
      findLikedPostIds: async () => new Set([postId]),
    } as never, {
      findSavedPostIds: async () => new Set([postId]),
    } as never);

    const discover = await service.discover(userId, { page: '1', limit: '1' });

    assert.equal(discover.hasMoreTrendingPosts, true);
    assert.equal(discover.trendingPosts[0].isSaved, true);
    assert.equal(discover.trendingPosts[0].isLiked, true);
  });
});
