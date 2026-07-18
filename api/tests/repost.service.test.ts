import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConflictError } from '../src/shared/errors/index.js';
import { RepostService } from '../src/modules/reposts/repost.service.js';

const createRepostService = (overrides: Record<string, unknown> = {}) => {
  const sentNotifications: unknown[] = [];
  const removedNotifications: unknown[] = [];
  const dependencies = {
    reposts: {
      exists: async () => null,
      create: async () => ({ _id: 'repost-1' }),
      delete: async () => ({ _id: 'repost-1' }),
    },
    posts: {
      findVisibleActionTarget: async () => ({ user: 'post-owner' }),
      incrementRepostsCount: async () => undefined,
    },
    blockRules: { ensureUsersCanInteract: async () => undefined },
    likes: {},
    saves: {},
    notifications: {
      send: async (input: unknown) => {
        sentNotifications.push(input);
        return input;
      },
      remove: async (input: unknown) => {
        removedNotifications.push(input);
        return input;
      },
    },
    ...overrides,
  };

  return {
    service: new RepostService(
      dependencies.reposts as never,
      dependencies.posts as never,
      dependencies.blockRules as never,
      dependencies.likes as never,
      dependencies.saves as never,
      dependencies.notifications as never,
    ),
    sentNotifications,
    removedNotifications,
  };
};

describe('RepostService notifications', () => {
  it('notifies the post owner when a post is reposted', async () => {
    const { service, sentNotifications } = createRepostService();

    const result = await service.repost('viewer-1', 'post-1');

    assert.equal(result.reposted, true);
    assert.deepEqual(sentNotifications, [{
      senderId: 'viewer-1',
      recipientId: 'post-owner',
      type: 'REPOST',
      contentId: 'post-1',
      onModel: 'Post',
    }]);
  });

  it('removes the repost notification when the repost is removed', async () => {
    const { service, removedNotifications } = createRepostService();

    const result = await service.unrepost('viewer-1', 'post-1');

    assert.equal(result.reposted, false);
    assert.deepEqual(removedNotifications, [{
      senderId: 'viewer-1',
      recipientId: 'post-owner',
      type: 'REPOST',
      contentId: 'post-1',
    }]);
  });

  it('rejects duplicate reposts before sending notifications', async () => {
    const { service, sentNotifications } = createRepostService({
      reposts: {
        exists: async () => ({ _id: 'existing-repost' }),
        create: async () => ({ _id: 'repost-1' }),
        delete: async () => null,
      },
    });

    await assert.rejects(() => service.repost('viewer-1', 'post-1'), ConflictError);
    assert.equal(sentNotifications.length, 0);
  });
});
