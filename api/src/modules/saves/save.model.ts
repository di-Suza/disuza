import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

type Save = {
  collectionId: Types.ObjectId;
  post: Types.ObjectId;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type SaveDocument = HydratedDocument<Save>;
type SaveModel = Model<Save>;

const saveSchema = new mongoose.Schema<Save, SaveModel>(
  {
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Collection id required!'],
      ref: 'SavedPostsCollection',
      index: true,
    },
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

saveSchema.index({ post: 1, user: 1 }, { unique: true });
saveSchema.index({ user: 1, collectionId: 1, createdAt: -1 });

const SaveModel = mongoose.models.Save as SaveModel || mongoose.model<Save, SaveModel>('Save', saveSchema, 'saves');

export { type Save, type SaveDocument };
export default SaveModel;