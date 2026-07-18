import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import ContributionLogModel from '../../src/modules/contributions/contributionLog.model.js';
import DailyContributionModel from '../../src/modules/contributions/dailyContribution.model.js';
import { HeatmapService } from '../../src/modules/contributions/heatmap.service.js';
import UserModel from '../../src/modules/users/user.model.js';
import { postId, userId } from '../helpers/domain.js';

type MutableStatics = Record<string, unknown>;

const replaceStatic = (model: unknown, key: string, value: unknown) => {
  const target = model as MutableStatics;
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
};

describe('HeatmapService', () => {
  it('does not count self-owned contributions', async () => {
    const service = new HeatmapService();
    await service.updateContribution(userId, 'POST', postId, userId);
  });

  it('creates contribution log, daily count, and profile contribution increments', async () => {
    const calls: string[] = [];
    const restoreFindById = replaceStatic(UserModel, 'findById', () => ({
      select: () => ({
        lean: async () => ({ createdAt: new Date('2020-01-01T00:00:00.000Z') }),
      }),
    }));
    const restoreFindOne = replaceStatic(DailyContributionModel, 'findOne', async () => null);
    const restoreCreate = replaceStatic(ContributionLogModel, 'create', async () => {
      calls.push('log');
    });
    const restoreDailyUpdate = replaceStatic(DailyContributionModel, 'findOneAndUpdate', async () => {
      calls.push('daily');
    });
    const restoreUserUpdate = replaceStatic(UserModel, 'findByIdAndUpdate', async () => {
      calls.push('user');
    });

    try {
      const service = new HeatmapService();
      await service.updateContribution(userId, 'POST', postId);
      assert.deepEqual(calls.sort(), ['daily', 'log', 'user']);
    } finally {
      restoreFindById();
      restoreFindOne();
      restoreCreate();
      restoreDailyUpdate();
      restoreUserUpdate();
    }
  });

  it('returns false when removing a contribution that was never logged', async () => {
    const restoreFindOneAndDelete = replaceStatic(ContributionLogModel, 'findOneAndDelete', async () => null);

    try {
      const service = new HeatmapService();
      assert.equal(await service.removeContribution(userId, postId, 'POST'), false);
    } finally {
      restoreFindOneAndDelete();
    }
  });
});
