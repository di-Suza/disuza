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

type PostLink = {
  label: string;
  url: string;
};

type PostLinkClick = {
  key: string;
  label: string;
  url: string;
  type: 'custom' | 'project';
  clicks: number;
};

type CodeSnippet = {
  language: string;
  code: string;
};

type PostCounts = {
  comments: number;
  likes: number;
  feedbacks: number;
  reposts: number;
};

type PostAnalytics = {
  shares: number;
  linkClicks: PostLinkClick[];
};

type PostUploadStatus = 'ready' | 'processing' | 'failed';

type PostUploadState = {
  status: PostUploadStatus;
  progress: number;
  clientUploadId?: string;
  mediaCount?: number;
  queuedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
};

type Post = {
  user: Types.ObjectId;
  caption: string;
  media: PostMedia[];
  counts: PostCounts;
  settings: PostSettings;
  analytics: PostAnalytics;
  isProjectPost: boolean;
  projectLinks?: ProjectLinks;
  links: PostLink[];
  codeSnippet?: CodeSnippet;
  hashtags: string[];
  uploadState: PostUploadState;
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

const postLinkSchema = new mongoose.Schema<PostLink>(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const postLinkClickSchema = new mongoose.Schema<PostLinkClick>(
  {
    key: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: ['custom', 'project'], required: true },
    clicks: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const codeSnippetSchema = new mongoose.Schema<CodeSnippet>(
  {
    language: { type: String, required: true, trim: true, maxlength: 40 },
    code: { type: String, required: true, maxlength: 8000 },
  },
  { _id: false },
);

const postUploadStateSchema = new mongoose.Schema<PostUploadState>(
  {
    status: { type: String, enum: ['ready', 'processing', 'failed'], default: 'ready', index: true },
    progress: { type: Number, default: 100, min: 0, max: 100 },
    clientUploadId: { type: String, trim: true },
    mediaCount: { type: Number, min: 0 },
    queuedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    error: { type: String, trim: true, maxlength: 240 },
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
      default: [],
      validate: {
        validator(media: PostMedia[]) {
          return Array.isArray(media) && media.length <= 10;
        },
        message: 'A post can contain up to 10 media items.',
      },
    },
    counts: {
      comments: { type: Number, default: 0, min: 0 },
      likes: { type: Number, default: 0, min: 0 },
      feedbacks: { type: Number, default: 0, min: 0 },
      reposts: { type: Number, default: 0, min: 0 },
    },
    settings: {
      hideLikesCount: { type: Boolean, default: false },
      commentsDisabled: { type: Boolean, default: false },
    },
    analytics: {
      shares: { type: Number, default: 0, min: 0 },
      linkClicks: {
        type: [postLinkClickSchema],
        default: [],
      },
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
    links: {
      type: [postLinkSchema],
      default: [],
      validate: {
        validator(links: PostLink[]) {
          return Array.isArray(links) && links.length <= 8;
        },
        message: 'A post can contain up to 8 links.',
      },
    },
    codeSnippet: {
      type: codeSnippetSchema,
      default: undefined,
    },
    hashtags: {
      type: [String],
      default: [],
      validate: {
        validator(hashtags: string[]) {
          return Array.isArray(hashtags) && hashtags.length <= 12;
        },
        message: 'A post can contain up to 12 hashtags.',
      },
    },
    uploadState: {
      type: postUploadStateSchema,
      default: () => ({ status: 'ready', progress: 100 }),
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
postSchema.index({ hashtags: 1, createdAt: -1 });

postSchema.pre('validate', function normalizePost(next) {
  if (Array.isArray(this.media)) {
    this.media = this.media
      .sort((first, second) => first.order - second.order)
      .map((item, index) => ({ ...item, order: index }));
  }

  if (Array.isArray(this.links)) {
    this.links = this.links.filter((link) => Boolean(link.label?.trim() && link.url?.trim()));
  }

  if (Array.isArray(this.hashtags)) {
    const seenHashtags = new Set<string>();
    this.hashtags = this.hashtags
      .map((hashtag) => hashtag.replace(/^#/, '').trim().toLowerCase())
      .filter((hashtag) => {
        if (!hashtag || seenHashtags.has(hashtag)) return false;
        seenHashtags.add(hashtag);
        return true;
      });
  }

  if (this.codeSnippet && (!this.codeSnippet.code?.trim() || !this.codeSnippet.language?.trim())) {
    this.codeSnippet = undefined;
  }

  if (this.isProjectPost) {
    if (!this.projectLinks?.liveDemoUrl || !this.projectLinks?.repositoryUrl) {
      this.invalidate('projectLinks', 'Both liveDemoUrl and repositoryUrl are required for project posts.');
    }
  } else {
    this.projectLinks = undefined;
  }

  const hasText = Boolean(this.caption?.trim());
  const hasMedia = Array.isArray(this.media) && this.media.length > 0;
  const hasCode = Boolean(this.codeSnippet?.code?.trim());
  const hasLinks = Array.isArray(this.links) && this.links.length > 0;
  const hasTags = Array.isArray(this.hashtags) && this.hashtags.length > 0;
  const hasProjectLinks = Boolean(this.projectLinks?.liveDemoUrl || this.projectLinks?.repositoryUrl);
  const hasQueuedMediaUpload = this.uploadState?.status === 'processing' && Number(this.uploadState?.mediaCount || 0) > 0;

  if (!hasText && !hasMedia && !hasCode && !hasLinks && !hasTags && !hasProjectLinks && !hasQueuedMediaUpload) {
    this.invalidate('caption', 'Post must include text, media, code, links, hashtags, or project links.');
  }

  next();
});

const PostModel = mongoose.models.Post as PostModel || mongoose.model<Post, PostModel>('Post', postSchema, 'posts');

export {
  type CodeSnippet,
  type Post,
  type PostAnalytics,
  type PostCounts,
  type PostDocument,
  type PostLink,
  type PostLinkClick,
  type PostMedia,
  type PostSettings,
  type PostUploadState,
  type PostUploadStatus,
  type ProjectLinks,
};
export default PostModel;
