export type MediaKind = 'image' | 'video';

export type PostMedia = {
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

export type PostSettings = {
  hideLikesCount: boolean;
  commentsDisabled: boolean;
};

export type ProjectLinks = {
  liveDemoUrl?: string;
  repositoryUrl?: string;
};

export type PostCounts = {
  comments: number;
  likes: number;
  feedbacks: number;
};

export type PostAuthor = {
  _id: string;
  userName: string;
  profilePicture?: {
    url?: string;
    fileId?: string;
  };
  headline?: string;
};

export type Post = {
  _id: string;
  id?: string;
  user?: PostAuthor | string;
  caption?: string;
  media?: PostMedia[];
  images?: PostMedia[];
  counts?: Partial<PostCounts>;
  settings?: Partial<PostSettings>;
  isProjectPost?: boolean;
  projectLinks?: ProjectLinks;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type MediaOrderItem =
  | { source: 'existing'; fileId: string }
  | { source: 'upload' | 'new'; uploadIndex: number };

export type CreatePostResponse = {
  success: boolean;
  message: string;
  post: Post;
};

export type UpdatePostResponse = CreatePostResponse;

export type DeletePostResponse = {
  success: boolean;
  message: string;
  deleted: boolean;
  alreadyDeleting: boolean;
};

export type PostsListResponse = {
  success: boolean;
  message: string;
  posts: Post[];
  page: number;
  hasMore: boolean;
};

export type SinglePostResponse = {
  success: boolean;
  message: string;
  post: Post;
};

export type FeedType = 'all' | 'following';

export type FeedQueryArgs = {
  page?: number;
  limit?: number;
  type?: FeedType;
};

export type PostsQueryArgs = {
  page?: number;
  limit?: number;
};