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

export type PostLink = {
  label: string;
  url: string;
};

export type PostLinkClick = {
  key: string;
  label: string;
  url: string;
  type: 'custom' | 'project';
  clicks: number;
};

export type CodeSnippet = {
  language: string;
  code: string;
};

export type PostCounts = {
  comments: number;
  likes: number;
  feedbacks: number;
  reposts: number;
};

export type PostAnalyticsState = {
  shares: number;
  linkClicks: PostLinkClick[];
};

export type PostUploadState = {
  status: 'ready' | 'processing' | 'failed';
  progress?: number;
  clientUploadId?: string;
  mediaCount?: number;
  queuedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
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
  analytics?: Partial<PostAnalyticsState>;
  isProjectPost?: boolean;
  projectLinks?: ProjectLinks;
  links?: PostLink[];
  codeSnippet?: CodeSnippet;
  hashtags?: string[];
  uploadState?: PostUploadState;
  isLiked?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Repost = {
  _id: string;
  id?: string;
  user: PostAuthor;
  post: Post;
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

export type PostRepostResponse = {
  success: boolean;
  message: string;
  reposted: boolean;
  alreadyUnreposted?: boolean;
};

export type PostAnalyticsSection = 'likes' | 'comments' | 'reposts' | 'feedbacks';

export type PostAnalyticsUser = {
  _id: string;
  userName: string;
  headline?: string;
  profilePicture?: {
    url?: string;
    fileId?: string;
  };
};

export type PostAnalyticsItem = {
  _id: string;
  user?: PostAnalyticsUser;
  comment?: string;
  replyCount?: number;
  parentComment?: string | null;
  replyToUser?: PostAnalyticsUser | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PostAnalyticsOverview = {
  counts: {
    likes: number;
    comments: number;
    feedbacks: number;
    reposts: number;
    shares: number;
    linkClicks: number;
  };
  links: PostLinkClick[];
};

export type PostAnalyticsResponse = {
  success: boolean;
  message: string;
  post: Pick<Post, '_id' | 'caption' | 'createdAt'>;
  overview: PostAnalyticsOverview;
  section: PostAnalyticsSection;
  items: PostAnalyticsItem[];
  page: number;
  hasMore: boolean;
};

export type PostAnalyticsQueryArgs = {
  postId: string;
  section?: PostAnalyticsSection;
  page?: number;
  limit?: number;
};

export type TrackPostLinkClickRequest = {
  postId: string;
  linkKey: string;
};

export type TrackPostLinkClickResponse = {
  success: boolean;
  message: string;
  counted: boolean;
  cooldownMs: number;
  link: PostLinkClick;
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

export type RepostListResponse = {
  success: boolean;
  message: string;
  reposts: Repost[];
  page: number;
  hasMore: boolean;
};

export type SingleRepostResponse = {
  success: boolean;
  message: string;
  repost: Repost;
};

export type FeedType = 'all' | 'following';

export type FeedQueryArgs = {
  page?: number;
  limit?: number;
  type?: FeedType;
  excludePostIds?: string[];
};

export type PostsQueryArgs = {
  page?: number;
  limit?: number;
};

export type UserRepostsQueryArgs = PostsQueryArgs & {
  userId: string;
};
