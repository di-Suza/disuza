import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

import { DEFAULT_SAVE_COVER } from './save.constants.js';

type SavedCollection = {
  name: string;
  owner: Types.ObjectId;
  isSystemGenerated: boolean;
  selected: boolean;
  coverImage: string;
  createdAt: Date;
  updatedAt: Date;
};

type SavedCollectionDocument = HydratedDocument<SavedCollection>;
type SavedCollectionModel = Model<SavedCollection>;

const savedCollectionSchema = new mongoose.Schema<SavedCollection, SavedCollectionModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isSystemGenerated: {
      type: Boolean,
      default: false,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    coverImage: {
      type: String,
      default: DEFAULT_SAVE_COVER,
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

savedCollectionSchema.index({ name: 1, owner: 1 }, { unique: true });
savedCollectionSchema.index({ owner: 1, selected: 1 });

const SavedCollectionModel = mongoose.models.SavedPostsCollection as SavedCollectionModel
  || mongoose.model<SavedCollection, SavedCollectionModel>('SavedPostsCollection', savedCollectionSchema, 'savedpostscollections');

export { type SavedCollection, type SavedCollectionDocument };
export default SavedCollectionModel;