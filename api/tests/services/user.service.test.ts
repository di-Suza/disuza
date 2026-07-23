import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UserService } from '../../src/modules/users/user.service.js';

type DailyCount = { _id: string; count: number };

const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const daily = (count: number): DailyCount[] => [{ _id: todayKey(), count }];

const createUserService = (overrides: Record<string, unknown> = {}) => {
  const dependencies = {
    users: { findById: async () => ({ _id: 'profile-user' }) },
    follows: { countFollowersByDay: async () => daily(2) },
    blocks: {},
    blockRules: { ensureUsersCanInteract: async () => undefined },
    media: {},
    likes: { countReceivedByDay: async () => daily(4) },
    posts: { countCreatedByDay: async () => daily(3) },
    reposts: { countReceivedByDay: async () => daily(1) },
    notifications: {},
    comments: { countReceivedByDay: async () => daily(5) },
    chats: { countFeedbacksReceivedByDay: async () => daily(6) },
    heatmap: {},
    otps: {},
    otpRecords: {},
    sessions: {},
    authCache: { invalidateUser: async () => undefined },
    accountDeletionVerifications: {},
    cleanupJobs: {},
    profileViews: {
      findRecent: async () => null,
      create: async () => ({ _id: 'profile-view' }),
      countByDay: async () => daily(7),
    },
    ...overrides,
  };

  return new UserService(
    dependencies.users as never,
    dependencies.follows as never,
    dependencies.blocks as never,
    dependencies.blockRules as never,
    dependencies.media as never,
    dependencies.likes as never,
    dependencies.posts as never,
    dependencies.reposts as never,
    dependencies.notifications as never,
    dependencies.comments as never,
    dependencies.chats as never,
    dependencies.heatmap as never,
    dependencies.otps as never,
    dependencies.otpRecords as never,
    dependencies.sessions as never,
    dependencies.authCache as never,
    dependencies.accountDeletionVerifications as never,
    dependencies.cleanupJobs as never,
    dependencies.profileViews as never,
  );
};

describe('UserService dashboard analytics', () => {
  it('builds totals and daily reach from repository aggregates', async () => {
    const service = createUserService();
    const result = await service.getDashboardAnalytics('user-1', '7d');

    assert.equal(result.range, '7d');
    assert.equal(result.totals.followers, 2);
    assert.equal(result.totals.posts, 3);
    assert.equal(result.totals.likes, 4);
    assert.equal(result.totals.comments, 5);
    assert.equal(result.totals.feedbacks, 6);
    assert.equal(result.totals.reposts, 1);
    assert.equal(result.totals.profileViews, 7);
    assert.equal(result.totals.reach, 23);
    assert.ok(result.series.length >= 7);
    assert.equal(result.series.at(-1)?.reach, 23);
  });

  it('falls back to monthly analytics when the range is invalid', async () => {
    const service = createUserService();
    const result = await service.getDashboardAnalytics('user-1', 'bad-range');

    assert.equal(result.range, '30d');
    assert.ok(result.series.length >= 30);
  });
});

describe('UserService profile views', () => {
  it('tracks a new profile view when the recent-view guard is clear', async () => {
    let created = false;
    const service = createUserService({
      profileViews: {
        findRecent: async () => null,
        create: async () => {
          created = true;
          return { _id: 'profile-view' };
        },
        countByDay: async () => [],
      },
    });

    const result = await service.recordProfileView('viewer-1', 'profile-1', '127.0.0.1', 'test-agent');

    assert.equal(result.counted, true);
    assert.equal(created, true);
  });

  it('does not duplicate a view inside the rate-limit window', async () => {
    let created = false;
    const service = createUserService({
      profileViews: {
        findRecent: async () => ({ _id: 'recent-view' }),
        create: async () => {
          created = true;
          return { _id: 'profile-view' };
        },
        countByDay: async () => [],
      },
    });

    const result = await service.recordProfileView('viewer-1', 'profile-1', '127.0.0.1', 'test-agent');

    assert.equal(result.counted, false);
    assert.equal(created, false);
  });

  it('never records a user viewing their own profile', async () => {
    let createCalls = 0;
    const service = createUserService({
      profileViews: {
        findRecent: async () => null,
        create: async () => {
          createCalls += 1;
          return { _id: 'profile-view' };
        },
        countByDay: async () => [],
      },
    });

    const result = await service.recordProfileView('same-user', 'same-user', '127.0.0.1', 'test-agent');

    assert.equal(result.counted, false);
    assert.equal(createCalls, 0);
  });
});
