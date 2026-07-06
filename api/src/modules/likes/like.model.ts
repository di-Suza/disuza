import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type Like = {
  post: Types.ObjectId;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type LikeDocument = HydratedDocument<Like>;
type LikeModel = Model<Like>;

const likeSchema = new mongoose.Schema<Like, LikeModel>(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Post id required!'],
      ref: 'Post',
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'User id required!'],
      ref: 'User',
      index: true,
    },
  },
  { timestamps: true },
);

likeSchema.index({ post: 1, user: 1 }, { unique: true });
likeSchema.index({ user: 1, createdAt: -1 });

const LikeModel = mongoose.models.Like as LikeModel || mongoose.model<Like, LikeModel>('Like', likeSchema, 'likes');

export { type Like, type LikeDocument };
export default LikeModel;