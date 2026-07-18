export type CommentAuthor = {
  _id: string;
  userName: string;
  profilePicture?: {
    url?: string;
    fileId?: string;
  };
};

export type CommentItem = {
  _id: string;
  comment: string;
  post: string;
  postOwner: string;
  user: CommentAuthor;
  parentComment?: string | null;
  replyToUser?: CommentAuthor | null;
  replyCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PostCommentRequest = {
  postId: string;
  comment: string;
  parentCommentId?: string;
};

export type PostCommentResponse = {
  success: boolean;
  message: string;
  newComment: CommentItem;
};

export type DeleteCommentRequest = {
  postId: string;
  commentId: string;
  parentCommentId?: string | null;
};

export type DeleteCommentResponse = {
  success: boolean;
  message: string;
  commentId: string;
  deletedCount: number;
  parentCommentId: string | null;
};

export type CommentsQueryArgs = {
  postId: string;
  page?: number;
  limit?: number;
};

export type CommentsResponse = {
  success: boolean;
  message: string;
  allComments: CommentItem[];
  currentPage: number;
  hasMore: boolean;
};

export type RepliesQueryArgs = {
  commentId: string;
  page?: number;
  limit?: number;
};

export type RepliesResponse = {
  success: boolean;
  message: string;
  replies: CommentItem[];
  currentPage: number;
  hasMore: boolean;
};