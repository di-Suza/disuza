import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PostService } from '../../src/modules/posts/post.service.js';
import { BadRequestError } from '../../src/shared/errors/index.js';
import { oid, otherUserId, postId, toObjectDocument, userId } from '../helpers/domain.js';

const createPostService = (overrides: Record<string, unknown> = {}) => {
  const cleanupJobs: unknown[] = [];
  const dependencies = {
    posts: {
      create: async (input: Record<string, unknown>) => ({ _id: input._id, ...input }),
      findOwnedAnalyticsTarget: async () => ({
        _id: oid(postId),
        caption: 'Project',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        counts: { likes: 1, comments: 1, feedbacks: 1, reposts: 1 },
        analytics: { shares: 2, linkClicks: [{ key: 'project:liveDemo', clicks: 3 }] },
        isProjectPost: true,
        projectLinks: { liveDemoUrl: 'https://demo.example', repositoryUrl: 'https://github.com/example/repo' },
        links: [{ label: 'Docs', url: 'https://docs.example' }],
      }),
      findVisibleLinkTarget: async () => ({
        _id: oid(postId),
        user: oid(otherUserId),
        analytics: { shares: 0, linkClicks: [] },
        isProjectPost: true,
        projectLinks: { liveDemoUrl: 'https://demo.example', repositoryUrl: 'https://github.com/example/repo' },
        links: [],
      }),
      incrementLinkClick: async () => undefined,
      findFeedPosts: async () => [
        { _id: oid(postId), createdAt: new Date('2020-01-01T00:00:00.000Z') },
        { _id: oid('507f1f77bcf86cd799439027'), createdAt: new Date('2020-01-02T00:00:00.000Z') },
      ],
      findOwnedVisibleById: async () => toObjectDocument({
        _id: oid(postId),
        caption: 'Post',
        media: [],
        links: [],
        codeSnippet: undefined,
        hashtags: [],
        isProjectPost: false,
        projectLinks: undefined,
      }),
      updateById: async (_targetPostId: string, input: unknown) => ({ _id: oid(postId), input }),
      markDeleting: async () => ({ _id: oid(postId), isDeleting: true }),
      findVisibleById: async () => toObjectDocument({ _id: oid(postId), user: oid(otherUserId), caption: 'Post' }),
    },
    reposts: {
      exists: async () => true,
      findRepostedPostIds: async () => new Set([postId]),
      findPostReposts: async () => [{ _id: oid(otherUserId) }],
    },
    ...overrides,
  };

  const service = new PostService(dependencies.posts as never, {
    incrementCounter: async () => undefined,
  } as never, {
    exists: async () => true,
    findLikedPostIds: async () => new Set([postId]),
    findPostLikes: async () => [{ _id: oid(userId) }],
  } as never, {
    exists: async () => false,
    findSavedPostIds: async () => new Set([postId]),
  } as never, dependencies.reposts as never, {
    findPostAnalyticsComments: async () => [{ _id: oid('507f1f77bcf86cd799439028') }],
  } as never, {
    findPostFeedbacks: async () => [{ _id: oid('507f1f77bcf86cd799439029'), sender: { _id: oid(userId) }, text: 'Great' }],
  } as never, {
    findFollowingIds: async () => [{ following: oid(otherUserId) }],
  } as never, {
    ensureUsersCanInteract: async () => undefined,
    getBlockedUserIds: async () => [],
  } as never, {
    uploadPostMedia: async () => [],
    tryDeleteFile: async () => true,
  } as never, {
    updateContribution: async () => undefined,
  } as never, {
    enqueuePostCleanup: async (input: unknown) => cleanupJobs.push(input),
  } as never);

  return { service, cleanupJobs };
};

describe('PostService', () => {
  it('creates project posts and validates required project URLs', async () => {
    const { service } = createPostService();

    await assert.rejects(() => service.createPost(userId, { isProjectPost: true, projectLinks: { liveDemoUrl: 'https://demo.example' } }, []), BadRequestError);
    const created = await service.createPost(userId, {
      caption: ' #Launch ',
      isProjectPost: true,
      projectLinks: { liveDemoUrl: 'https://demo.example', repositoryUrl: 'https://github.com/example/repo' },
    }, []);

    assert.equal(created.isProjectPost, true);
    assert.deepEqual(created.hashtags, ['launch']);
  });

  it('tracks project/custom link clicks with cooldown and returns analytics sections', async () => {
    const { service } = createPostService();

    const click = await service.trackLinkClick(userId, postId, 'project:liveDemo', '127.0.0.1');
    const secondClick = await service.trackLinkClick(userId, postId, 'project:liveDemo', '127.0.0.1');
    assert.equal(click.counted, true);
    assert.equal(secondClick.counted, false);

    const analytics = await service.getPostAnalytics(userId, postId, 'feedbacks', '1', '1');
    assert.equal(analytics.overview.counts.linkClicks, 3);
    assert.equal((analytics.items[0] as { comment?: string }).comment, 'Great');
    assert.equal(analytics.hasMore, true);
  });

  it('attaches viewer state to feed and single post reads', async () => {
    const { service } = createPostService();

    const feed = await service.getFeed(userId, '2', '2', 'following');
    const feedPost = feed.posts.find((item) => item._id.toString() === postId);
    assert.equal(feedPost?.isLiked, true);
    assert.equal(feedPost?.isSaved, true);
    assert.equal(feedPost?.isReposted, true);

    const post = await service.getPost(userId, postId);
    assert.equal(post.isLiked, true);
    assert.equal(post.isSaved, false);
    assert.equal(post.isReposted, true);
  });

  it('updates and deletes posts while enforcing project-link ownership rules', async () => {
    const { service, cleanupJobs } = createPostService();

    await assert.rejects(() => service.updatePost(userId, postId, {
      projectLinks: { liveDemoUrl: 'https://demo.example', repositoryUrl: 'https://github.com/example/repo' },
    }, []), BadRequestError);

    const deleted = await service.deletePost(userId, postId);
    assert.equal(deleted.deleted, true);
    assert.equal(cleanupJobs.length, 1);
  });
});
