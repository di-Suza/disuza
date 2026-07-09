import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

import type { ContributionType } from './dailyContribution.model.js';

type ContributionLog = {
  user: Types.ObjectId;
  targetId: Types.ObjectId;
  type: ContributionType;
  dateStr: string;
  createdAt: Date;
  updatedAt: Date;
};

type ContributionLogDocument = HydratedDocument<ContributionLog>;
type ContributionLogModel = Model<ContributionLog>;

const contributionLogSchema = new mongoose.Schema<ContributionLog, ContributionLogModel>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['POST', 'COMMENT', 'FEEDBACK'], required: true },
    dateStr: { type: String, required: true },
  },
  { timestamps: true },
);

contributionLogSchema.index({ targetId: 1 }, { unique: true });

const ContributionLogModel = mongoose.models.ContributionLog as ContributionLogModel
  || mongoose.model<ContributionLog, ContributionLogModel>('ContributionLog', contributionLogSchema, 'contributionlogs');

export { type ContributionLog, type ContributionLogDocument };
export default ContributionLogModel;
