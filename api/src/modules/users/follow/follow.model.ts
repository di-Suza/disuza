import mongoose, { type HydratedDocument, type Model } from 'mongoose';

type Follow = {
  follower: mongoose.Types.ObjectId;
  following: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type FollowDocument = HydratedDocument<Follow>;

type FollowModel = Model<Follow>;

const followSchema = new mongoose.Schema<Follow, FollowModel>(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, createdAt: -1 });
followSchema.index({ follower: 1, createdAt: -1 });

const FollowModel = mongoose.models.Follow as FollowModel || mongoose.model<Follow, FollowModel>('Follow', followSchema, 'follows');

export { type Follow, type FollowDocument };
export default FollowModel;
