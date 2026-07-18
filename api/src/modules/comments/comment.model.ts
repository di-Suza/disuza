import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type Comment = {
  comment: string;
  post: Types.ObjectId;
  postOwner: Types.ObjectId;
  user: Types.ObjectId;
  parentComment: Types.ObjectId | null;
  replyToUser: Types.ObjectId | null;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type CommentDocument = HydratedDocument<Comment>;
type CommentModel = Model<Comment>;

const commentSchema = new mongoose.Schema<Comment, CommentModel>(
  {
    comment: {
      type: String,
      trim: true,
      required: [true, 'Comment cannot be empty'],
      maxlength: 1000,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Post',
      index: true,
    },
    postOwner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    replyToUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
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

commentSchema.index({ post: 1, parentComment: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });

const CommentModel = mongoose.models.Comment as CommentModel || mongoose.model<Comment, CommentModel>('Comment', commentSchema, 'comments');

export { type Comment, type CommentDocument };
export default CommentModel;