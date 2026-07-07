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

export type PostLikeResponse = {
  success: boolean;
  message: string;
  liked: boolean;
  alreadyLiked?: boolean;
  alreadyUnliked?: boolean;
};

export type SavedCollection = {
  _id: string;
  id?: string;
  name: string;
  owner?: string;
  isSystemGenerated?: boolean;
  selected?: boolean;
  coverImage?: string;
  postsCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SavePostRequest = {
  postId: string;
  collectionId?: string;
};

export type SavePostResult = {
  saved: boolean;
  message?: string;
  collection?: Pick<SavedCollection, '_id' | 'name'>;
};

export type SavePostResponse = {
  success: boolean;
  message: string;
  data: SavePostResult;
};

export type UnsavePostResponse = {
  success: boolean;
  message: string;
  saved: boolean;
};

export type SavedCollectionsResponse = {
  success: boolean;
  message: string;
  collections: SavedCollection[];
};

export type SavedCollectionResponse = {
  success: boolean;
  message: string;
  collection: SavedCollection;
};

export type DeleteCollectionResponse = {
  success: boolean;
  message: string;
  deletedSaves?: number;
};

export type SavedCollectionPostsResponse = {
  success: boolean;
  message: string;
  collection: SavedCollection;
  posts: Post[];
  page: number;
  hasMore: boolean;
};

export type SavedCollectionPostsQueryArgs = {
  collectionId: string;
  page?: number;
  limit?: number;
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