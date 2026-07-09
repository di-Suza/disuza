import type { Types } from 'mongoose';

import UserModel from '../users/user.model.js';
import ContributionLogModel from './contributionLog.model.js';
import DailyContributionModel, { type ContributionType } from './dailyContribution.model.js';

const cooldowns: Record<ContributionType, number> = {
  POST: 30,
  COMMENT: 10,
  FEEDBACK: 15,
};

class HeatmapService {
  private getToday(): string {
    return new Date().toLocaleDateString('en-CA');
  }

  private getIncrementFields(type: ContributionType, delta: 1 | -1) {
    return {
      totalCount: delta,
      ...(type === 'POST' ? { postsCount: delta } : {}),
      ...(type === 'COMMENT' ? { commentsCount: delta } : {}),
      ...(type === 'FEEDBACK' ? { feedbackCount: delta } : {}),
    };
  }

  async updateContribution(userId: string | Types.ObjectId, type: ContributionType, targetId: string | Types.ObjectId, ownerId: string | Types.ObjectId | null = null) {
    try {
      if (ownerId && userId.toString() === ownerId.toString()) return;

      const today = this.getToday();
      const user = await UserModel.findById(userId).select('createdAt').lean();
      if (!user) return;

      const accountAgeInDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const dailyMaxLimit = accountAgeInDays > 30 ? 15 : 8;
      const doc = await DailyContributionModel.findOne({ user: userId, date: today });

      if (doc) {
        if (doc.totalCount >= dailyMaxLimit) return;
        const lastTime = doc.lastActions?.[type] || 0;
        const secondsPassed = (Date.now() - new Date(lastTime).getTime()) / 1000;
        if (secondsPassed < cooldowns[type]) return;
      }

      await Promise.all([
        ContributionLogModel.create({ user: userId, targetId, type, dateStr: today }),
        DailyContributionModel.findOneAndUpdate(
          { user: userId, date: today },
          {
            $inc: this.getIncrementFields(type, 1),
            $set: { [`lastActions.${type}`]: new Date(), lastContributionAt: new Date() },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        ),
        UserModel.findByIdAndUpdate(userId, { $inc: { profileContributions: 1 } }),
      ]);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return;
      if (process.env.NODE_ENV !== 'production') console.error('Contribution Error:', error);
    }
  }

  async getHeatmap(userId: string | Types.ObjectId) {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const startDateStr = sixMonthsAgo.toISOString().split('T')[0];

      return DailyContributionModel.find({ user: userId, date: { $gte: startDateStr } })
        .select('date totalCount postsCount commentsCount feedbackCount -_id')
        .sort({ date: 1 })
        .lean();
    } catch {
      return [];
    }
  }

  async removeContribution(userId: string | Types.ObjectId, targetId: string | Types.ObjectId, type: ContributionType) {
    try {
      const log = await ContributionLogModel.findOneAndDelete({ targetId, user: userId, type });
      if (!log) return false;

      await Promise.all([
        DailyContributionModel.findOneAndUpdate(
          { user: userId, date: log.dateStr, totalCount: { $gt: 0 } },
          { $inc: this.getIncrementFields(type, -1) },
        ),
        UserModel.findByIdAndUpdate(userId, { $inc: { profileContributions: -1 } }),
      ]);

      return true;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('Remove Contribution Error:', error);
      return false;
    }
  }
}

const heatmapService = new HeatmapService();

export { HeatmapService };
export default heatmapService;
