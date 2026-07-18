import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

const REPORT_TARGET_MODELS = ['Post', 'User', 'Message'] as const;
const REPORT_REASONS = ['Spam', 'Inappropriate Content', 'Harassment', 'Violence', 'Hate Speech', 'Other'] as const;
const REPORT_STATUSES = ['Pending', 'Reviewed', 'Resolved', 'Dismissed'] as const;

type ReportTargetModel = typeof REPORT_TARGET_MODELS[number];
type ReportReason = typeof REPORT_REASONS[number];
type ReportStatus = typeof REPORT_STATUSES[number];

type Report = {
  reporter: Types.ObjectId;
  targetId: Types.ObjectId;
  onModel: ReportTargetModel;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  response: string;
  createdAt: Date;
  updatedAt: Date;
};

type ReportDocument = HydratedDocument<Report>;
type ReportModel = Model<Report>;

const reportSchema = new mongoose.Schema<Report, ReportModel>(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'onModel',
      index: true,
    },
    onModel: {
      type: String,
      required: true,
      enum: REPORT_TARGET_MODELS,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: REPORT_REASONS,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'Pending',
      index: true,
    },
    response: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const output = ret as Record<string, unknown>;
        delete output.__v;
        return output;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret) {
        const output = ret as Record<string, unknown>;
        delete output.__v;
        return output;
      },
    },
  },
);

reportSchema.index({ reporter: 1, targetId: 1, onModel: 1 }, { unique: true });
reportSchema.index({ reporter: 1, createdAt: -1 });

const ReportModel = mongoose.models.Report as ReportModel || mongoose.model<Report, ReportModel>('Report', reportSchema, 'reports');

export {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_MODELS,
  type Report,
  type ReportDocument,
  type ReportReason,
  type ReportStatus,
  type ReportTargetModel,
};
export default ReportModel;