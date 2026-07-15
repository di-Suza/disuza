import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type Repost = {
  user: Types.ObjectId;
  post: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type RepostDocument = HydratedDocument<Repost>;
type RepostModel = Model<Repost>;

const repostSchema = new mongoose.Schema<Repost, RepostModel>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  },
  { timestamps: true },
);

repostSchema.index({ user: 1, post: 1 }, { unique: true });
repostSchema.index({ post: 1, createdAt: -1 });

const RepostModel = mongoose.models.Repost as RepostModel
  || mongoose.model<Repost, RepostModel>('Repost', repostSchema, 'reposts');

export { type Repost, type RepostDocument };
export default RepostModel;
