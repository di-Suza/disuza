import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

import type { MediaKind } from '../media/media.types.js';

type PostMedia = {
  url: string;
  fileId: string;
  mediaType: MediaKind;
  order: number;
  filePath?: string;
  name?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size?: number;
  mime?: string;
};

type PostSettings = {
  hideLikesCount: boolean;
  commentsDisabled: boolean;
};

type ProjectLinks = {
  liveDemoUrl?: string;
  repositoryUrl?: string;
};

type PostCounts = {
  comments: number;
  likes: number;
  feedbacks: number;
};

type Post = {
  user: Types.ObjectId;
  caption: string;
  media: PostMedia[];
  counts: PostCounts;
  settings: PostSettings;
  isProjectPost: boolean;
  projectLinks?: ProjectLinks;
  isDeleting: boolean;
  deletedAt: Date | null;
  cleanupState: {
    countsAdjusted: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
};

type PostDocument = HydratedDocument<Post>;
type PostModel = Model<Post>;

const postMediaSchema = new mongoose.Schema<PostMedia>(
  {
    url: { type: String, required: true, trim: true },
    fileId: { type: String, required: true, trim: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    order: { type: Number, required: true, min: 0 },
    filePath: { type: String, trim: true },
    name: { type: String, trim: true },
    thumbnailUrl: { type: String, trim: true },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    size: { type: Number, min: 0 },
    mime: { type: String, trim: true },
  },
  { _id: false },
);

const postSchema = new mongoose.Schema<Post, PostModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    caption: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2200,
    },
    media: {
      type: [postMediaSchema],
      required: true,
      validate: {
        validator(media: PostMedia[]) {
          return Array.isArray(media) && media.length > 0 && media.length <= 10;
        },
        message: 'A post must contain between 1 and 10 media items.',
      },
    },
    counts: {
      comments: { type: Number, default: 0, min: 0 },
      likes: { type: Number, default: 0, min: 0 },
      feedbacks: { type: Number, default: 0, min: 0 },
    },
    settings: {
      hideLikesCount: { type: Boolean, default: false },
      commentsDisabled: { type: Boolean, default: false },
    },
    isProjectPost: {
      type: Boolean,
      default: false,
      index: true,
    },
    projectLinks: {
      liveDemoUrl: { type: String, trim: true },
      repositoryUrl: { type: String, trim: true },
    },
    isDeleting: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    cleanupState: {
      countsAdjusted: { type: Boolean, default: false },
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

postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ isDeleting: 1, createdAt: -1 });

postSchema.pre('validate', function normalizePost(next) {
  if (Array.isArray(this.media)) {
    this.media = this.media
      .sort((first, second) => first.order - second.order)
      .map((item, index) => ({ ...item, order: index }));
  }

  if (this.isProjectPost) {
    if (!this.projectLinks?.liveDemoUrl || !this.projectLinks?.repositoryUrl) {
      this.invalidate('projectLinks', 'Both liveDemoUrl and repositoryUrl are required for project posts.');
    }
  } else {
    this.projectLinks = undefined;
  }

  next();
});

const PostModel = mongoose.models.Post as PostModel || mongoose.model<Post, PostModel>('Post', postSchema, 'posts');

export { type Post, type PostCounts, type PostDocument, type PostMedia, type PostSettings, type ProjectLinks };
export default PostModel;
