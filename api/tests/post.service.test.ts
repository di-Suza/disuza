import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PostService } from '../src/modules/posts/post.service.js';

const postIdA = '507f1f77bcf86cd799439011';
const postIdB = '507f1f77bcf86cd799439012';

const createPostService = () => {
  const feedCalls: Array<{
    page: number;
    limit: number;
    seenPostIds: string[];
  }> = [];
  const dependencies = {
    posts: {
      findFeedPosts: async (_filter: unknown, page: number, limit: number, seenPostIds: string[]) => {
        feedCalls.push({ page, limit, seenPostIds });
        return [
          { _id: postIdB, createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), user: { _id: 'owner-1' } },
        ];
      },
    },
    users: {},
    likes: { findLikedPostIds: async () => new Set<string>() },
    saves: { findSavedPostIds: async () => new Set<string>() },
    reposts: { findRepostedPostIds: async () => new Set<string>() },
    comments: {},
    chats: {},
    follows: { findFollowingIds: async () => [] },
    blockRules: { getBlockedUserIds: async () => [] },
    media: {},
    heatmap: {},
    cleanupJobs: {},
  };

  return {
    service: new PostService(
      dependencies.posts as never,
      dependencies.users as never,
      dependencies.likes as never,
      dependencies.saves as never,
      dependencies.reposts as never,
      dependencies.comments as never,
      dependencies.chats as never,
      dependencies.follows as never,
      dependencies.blockRules as never,
      dependencies.media as never,
      dependencies.heatmap as never,
      dependencies.cleanupJobs as never,
    ),
    feedCalls,
  };
};

describe('PostService feed rotation', () => {
  it('passes sanitized loaded post ids to feed repository calls', async () => {
    const { service, feedCalls } = createPostService();

    const result = await service.getFeed('viewer-1', 2, 10, 'all', `${postIdA},bad-id,${postIdA},${postIdB}`);

    assert.equal(result.page, 2);
    assert.equal(result.posts.length, 1);
    assert.deepEqual(feedCalls[0], {
      page: 2,
      limit: 10,
      seenPostIds: [postIdA, postIdB],
    });
  });
});
