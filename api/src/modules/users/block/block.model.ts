import mongoose, { type HydratedDocument, type Model } from 'mongoose';

type Block = {
  blocker: mongoose.Types.ObjectId;
  blockedUser: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type BlockDocument = HydratedDocument<Block>;

type BlockModel = Model<Block>;

const blockSchema = new mongoose.Schema<Block, BlockModel>(
  {
    blocker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    blockedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

blockSchema.index({ blocker: 1, blockedUser: 1 }, { unique: true });
blockSchema.index({ blockedUser: 1, blocker: 1 });

const BlockModel = mongoose.models.Block as BlockModel || mongoose.model<Block, BlockModel>('Block', blockSchema, 'blocks');

export { type Block, type BlockDocument };
export default BlockModel;
