import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

const ISSUE_CATEGORIES = ['Bug', 'Spam', 'Abuse', 'Technical', 'Other'] as const;
const ISSUE_STATUSES = ['Pending', 'In-Progress', 'Resolved', 'Dismissed'] as const;

type IssueCategory = typeof ISSUE_CATEGORIES[number];
type IssueStatus = typeof ISSUE_STATUSES[number];

type Issue = {
  reporter: Types.ObjectId;
  category: IssueCategory;
  description: string;
  status: IssueStatus;
  createdAt: Date;
  updatedAt: Date;
};

type IssueDocument = HydratedDocument<Issue>;
type IssueModel = Model<Issue>;

const issueSchema = new mongoose.Schema<Issue, IssueModel>(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ISSUE_CATEGORIES,
      default: 'Bug',
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ISSUE_STATUSES,
      default: 'Pending',
      index: true,
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

issueSchema.index({ reporter: 1, createdAt: -1 });
issueSchema.index({ status: 1, createdAt: -1 });

const IssueModel = mongoose.models.Issue as IssueModel || mongoose.model<Issue, IssueModel>('Issue', issueSchema, 'issues');

export { ISSUE_CATEGORIES, ISSUE_STATUSES, type Issue, type IssueCategory, type IssueDocument, type IssueStatus };
export default IssueModel;
