import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type ContributionType = 'POST' | 'COMMENT' | 'FEEDBACK';

type DailyContribution = {
  user: Types.ObjectId;
  date: string;
  postsCount: number;
  commentsCount: number;
  feedbackCount: number;
  totalCount: number;
  lastContributionAt: Date;
  lastActions: Record<ContributionType, Date | number>;
  createdAt: Date;
  updatedAt: Date;
};

type DailyContributionDocument = HydratedDocument<DailyContribution>;
type DailyContributionModel = Model<DailyContribution>;

const dailyContributionSchema = new mongoose.Schema<DailyContribution, DailyContributionModel>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    postsCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    feedbackCount: { type: Number, default: 0, min: 0 },
    totalCount: { type: Number, default: 0, min: 0 },
    lastContributionAt: { type: Date, default: Date.now },
    lastActions: {
      POST: { type: Date, default: 0 },
      COMMENT: { type: Date, default: 0 },
      FEEDBACK: { type: Date, default: 0 },
    },
  },
  { timestamps: true },
);

dailyContributionSchema.index({ user: 1, date: 1 }, { unique: true });

const DailyContributionModel = mongoose.models.DailyContribution as DailyContributionModel
  || mongoose.model<DailyContribution, DailyContributionModel>('DailyContribution', dailyContributionSchema, 'dailycontributions');

export { type ContributionType, type DailyContribution, type DailyContributionDocument };
export default DailyContributionModel;
