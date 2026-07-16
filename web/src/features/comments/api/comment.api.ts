import { api } from '@/shared/api/api';
import type { AuthUser } from '@/features/auth/model/auth.types';
import { postApi } from '@/features/posts/api/post.api';
import type {
  FeedQueryArgs,
  Post,
  PostsListResponse,
  PostsQueryArgs,
  RepostListResponse,
  SavedCollectionPostsQueryArgs,
  SavedCollectionPostsResponse,
  SinglePostResponse,
  SingleRepostResponse,
  UserRepostsQueryArgs,
} from '@/features/posts/model/post.types';
import { userApi } from '@/features/users/api/user.api';
import type { ProfileUserResponse } from '@/features/users/model/user.types';
import type {
  CommentItem,
  CommentsQueryArgs,
  CommentsResponse,
  DeleteCommentRequest,
  DeleteCommentResponse,
  PostCommentRequest,
  PostCommentResponse,
  RepliesQueryArgs,
  RepliesResponse,
} from '../model/comment.types';

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

const updateParentReplyCount = (comments: CommentItem[] | undefined, parentCommentId: string, delta: number) => {
  const parentComment = comments?.find((comment) => comment._id === parentCommentId);

  if (parentComment) {
    parentComment.replyCount = Math.max(0, Number(parentComment.replyCount || 0) + delta);
  }
};

const postInvalidationTags = (postId: string) => [
  { type: 'Post' as const, id: postId },
  'Posts' as const,
  'Feed' as const,
  'ProfileUser' as const,
  'UserAccountHistory' as const,
];

type UndoablePatch = {
  undo: () => void;
};

type ApiQueryEntry = {
  endpointName?: string;
  status?: string;
  originalArgs?: unknown;
};

type ApiCacheState = {
  api?: {
    queries?: Record<string, ApiQueryEntry>;
  };
};

const getFulfilledQueryEntries = (state: unknown, endpointNames: string[]): ApiQueryEntry[] => {
  const queries = (state as ApiCacheState).api?.queries;
  if (!queries) return [];

  return Object.values(queries).filter(
    (entry) => entry.status === 'fulfilled' && Boolean(entry.endpointName && endpointNames.includes(entry.endpointName)),
  );
};

const getCurrentUser = (state: unknown): AuthUser | null => (
  state as { auth?: { user?: AuthUser | null } }
).auth?.user || null;

const createOptimisticComment = (arg: PostCommentRequest, currentUser: AuthUser | null): CommentItem => ({
  _id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  comment: arg.comment,
  post: arg.postId,
  postOwner: '',
  user: {
    _id: currentUser?._id || 'current-user',
    userName: currentUser?.userName || 'You',
    profilePicture: currentUser?.profilePicture,
  },
  parentComment: arg.parentCommentId || null,
  replyCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const replaceComment = (comments: CommentItem[] | undefined, temporaryId: string, nextComment: CommentItem) => {
  if (!comments) return;

  const index = comments.findIndex((comment) => comment._id === temporaryId);
  if (index >= 0) comments[index] = nextComment;
};

const updatePostCommentCount = (post: Post | undefined, delta: number) => {
  if (!post) return;

  post.counts = {
    ...post.counts,
    comments: Math.max(0, Number(post.counts?.comments || 0) + delta),
  };
};

const updatePostsListCommentCount = (draft: PostsListResponse | undefined, postId: string, delta: number) => {
  const post = draft?.posts?.find((item) => item._id === postId);
  updatePostCommentCount(post, delta);
};

const updateSavedPostsCommentCount = (draft: SavedCollectionPostsResponse | undefined, postId: string, delta: number) => {
  const post = draft?.posts?.find((item) => item._id === postId);
  updatePostCommentCount(post, delta);
};

const updateProfilePostCommentCount = (draft: ProfileUserResponse | undefined, postId: string, delta: number) => {
  draft?.normalPosts?.forEach((post) => {
    if (post._id === postId) updatePostCommentCount(post, delta);
  });
  draft?.projectPosts?.forEach((post) => {
    if (post._id === postId) updatePostCommentCount(post, delta);
  });
};

const updateRepostPostCommentCount = (draft: RepostListResponse | undefined, postId: string, delta: number) => {
  draft?.reposts?.forEach((repost) => {
    if (repost.post?._id === postId) updatePostCommentCount(repost.post, delta);
  });
};

const collectPostCommentCountPatches = (dispatch: (action: unknown) => unknown, state: unknown, postId: string, delta: number): UndoablePatch[] => {
  const patches: UndoablePatch[] = [
    dispatch(
      postApi.util.updateQueryData('getPost', postId, (draft: SinglePostResponse | undefined) => {
        updatePostCommentCount(draft?.post, delta);
      }),
    ) as UndoablePatch,
  ];

  getFulfilledQueryEntries(state, ['getFeed', 'getAllPosts', 'getSavedCollectionPosts', 'getUserReposts', 'getRepost', 'getProfileUser']).forEach((entry) => {
    if (entry.endpointName === 'getFeed') {
      patches.push(dispatch(
        postApi.util.updateQueryData('getFeed', entry.originalArgs as FeedQueryArgs | void, (draft) => {
          updatePostsListCommentCount(draft, postId, delta);
        }),
      ) as UndoablePatch);
    }

    if (entry.endpointName === 'getAllPosts') {
      patches.push(dispatch(
        postApi.util.updateQueryData('getAllPosts', entry.originalArgs as PostsQueryArgs | void, (draft) => {
          updatePostsListCommentCount(draft, postId, delta);
        }),
      ) as UndoablePatch);
    }

    if (entry.endpointName === 'getSavedCollectionPosts') {
      patches.push(dispatch(
        postApi.util.updateQueryData('getSavedCollectionPosts', entry.originalArgs as SavedCollectionPostsQueryArgs, (draft) => {
          updateSavedPostsCommentCount(draft, postId, delta);
        }),
      ) as UndoablePatch);
    }

    if (entry.endpointName === 'getUserReposts') {
      patches.push(dispatch(
        postApi.util.updateQueryData('getUserReposts', entry.originalArgs as UserRepostsQueryArgs, (draft) => {
          updateRepostPostCommentCount(draft, postId, delta);
        }),
      ) as UndoablePatch);
    }

    if (entry.endpointName === 'getRepost') {
      patches.push(dispatch(
        postApi.util.updateQueryData('getRepost', entry.originalArgs as string, (draft: SingleRepostResponse | undefined) => {
          if (draft?.repost?.post?._id === postId) updatePostCommentCount(draft.repost.post, delta);
        }),
      ) as UndoablePatch);
    }

    if (entry.endpointName === 'getProfileUser') {
      patches.push(dispatch(
        userApi.util.updateQueryData('getProfileUser', entry.originalArgs as string, (draft) => {
          updateProfilePostCommentCount(draft, postId, delta);
        }),
      ) as UndoablePatch);
    }
  });

  return patches;
};

const undoPatches = (patches: UndoablePatch[]) => {
  patches.forEach((patch) => patch.undo());
};

export const commentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    postComment: builder.mutation<PostCommentResponse, PostCommentRequest>({
      query: (body) => ({
        url: '/comment/postComment',
        method: 'POST',
        body,
      }),
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        const optimisticComment = createOptimisticComment(arg, getCurrentUser(getState()));
        const patches: UndoablePatch[] = [];

        if (arg.parentCommentId) {
          patches.push(
            dispatch(
              commentApi.util.updateQueryData('getReplies', { commentId: arg.parentCommentId }, (draft) => {
                if (!draft.replies.some((reply) => reply._id === optimisticComment._id)) {
                  draft.replies.push(optimisticComment);
                }
              }),
            ),
          );

          patches.push(
            dispatch(
              commentApi.util.updateQueryData('getAllComments', { postId: arg.postId }, (draft) => {
                updateParentReplyCount(draft.allComments, arg.parentCommentId!, 1);
              }),
            ),
          );
        } else {
          patches.push(
            dispatch(
              commentApi.util.updateQueryData('getAllComments', { postId: arg.postId }, (draft) => {
                if (!draft.allComments.some((comment) => comment._id === optimisticComment._id)) {
                  draft.allComments.unshift(optimisticComment);
                }
              }),
            ),
          );
        }

        patches.push(...collectPostCommentCountPatches(dispatch, getState(), arg.postId, 1));

        try {
          const { data } = await queryFulfilled;
          const newComment = data.newComment;

          if (arg.parentCommentId) {
            dispatch(
              commentApi.util.updateQueryData('getReplies', { commentId: arg.parentCommentId }, (draft) => {
                replaceComment(draft.replies, optimisticComment._id, newComment);
              }),
            );
          } else {
            dispatch(
              commentApi.util.updateQueryData('getAllComments', { postId: arg.postId }, (draft) => {
                replaceComment(draft.allComments, optimisticComment._id, newComment);
              }),
            );
          }

          dispatch(commentApi.util.invalidateTags(postInvalidationTags(arg.postId)));
        } catch {
          undoPatches(patches);
        }
      },
    }),
    deleteComment: builder.mutation<DeleteCommentResponse, DeleteCommentRequest>({
      query: (body) => ({
        url: '/comment/deleteComment',
        method: 'DELETE',
        body,
      }),
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        const patches: UndoablePatch[] = [];

        if (arg.parentCommentId) {
          patches.push(
            dispatch(
              commentApi.util.updateQueryData('getReplies', { commentId: arg.parentCommentId }, (draft) => {
                draft.replies = draft.replies.filter((reply) => reply._id !== arg.commentId);
              }),
            ),
          );

          patches.push(
            dispatch(
              commentApi.util.updateQueryData('getAllComments', { postId: arg.postId }, (draft) => {
                updateParentReplyCount(draft.allComments, arg.parentCommentId!, -1);
              }),
            ),
          );
        } else {
          patches.push(
            dispatch(
              commentApi.util.updateQueryData('getAllComments', { postId: arg.postId }, (draft) => {
                draft.allComments = draft.allComments.filter((comment) => comment._id !== arg.commentId);
              }),
            ),
          );
        }

        patches.push(...collectPostCommentCountPatches(dispatch, getState(), arg.postId, -1));

        try {
          const { data } = await queryFulfilled;
          const extraDeletedCount = Math.max(Number(data?.deletedCount || 1) - 1, 0);

          if (extraDeletedCount > 0) {
            collectPostCommentCountPatches(dispatch, getState(), arg.postId, -extraDeletedCount);
          }

          dispatch(commentApi.util.invalidateTags(postInvalidationTags(arg.postId)));
        } catch {
          undoPatches(patches);
        }
      },
    }),
    getAllComments: builder.query<CommentsResponse, CommentsQueryArgs>({
      query: ({ limit, page = 1, postId }) => `/comment/getAllComments/${postId}?${toQueryString({ page, limit })}`,
      providesTags: (_result, _error, { postId }) => [{ type: 'Comments', id: postId }],
      serializeQueryArgs: ({ endpointName, queryArgs }) => `${endpointName}-${queryArgs.postId}`,
      merge: (currentCache, newItems, { arg }) => {
        if ((arg.page || 1) === 1) {
          currentCache.allComments = newItems.allComments;
          currentCache.currentPage = newItems.currentPage;
          currentCache.hasMore = newItems.hasMore;
          currentCache.message = newItems.message;
          currentCache.success = newItems.success;
          return;
        }

        const existingIds = new Set(currentCache.allComments.map((comment) => comment._id));
        currentCache.allComments.push(...newItems.allComments.filter((comment) => !existingIds.has(comment._id)));
        currentCache.currentPage = newItems.currentPage;
        currentCache.hasMore = newItems.hasMore;
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page || currentArg?.postId !== previousArg?.postId;
      },
    }),
    getReplies: builder.query<RepliesResponse, RepliesQueryArgs>({
      query: ({ commentId, limit, page = 1 }) => `/comment/getReplies/${commentId}?${toQueryString({ page, limit })}`,
      providesTags: (_result, _error, { commentId }) => [{ type: 'CommentReplies', id: commentId }],
      serializeQueryArgs: ({ endpointName, queryArgs }) => `${endpointName}-${queryArgs.commentId}`,
      merge: (currentCache, newItems, { arg }) => {
        if ((arg.page || 1) === 1) {
          currentCache.replies = newItems.replies;
          currentCache.currentPage = newItems.currentPage;
          currentCache.hasMore = newItems.hasMore;
          currentCache.message = newItems.message;
          currentCache.success = newItems.success;
          return;
        }

        const existingIds = new Set(currentCache.replies.map((reply) => reply._id));
        currentCache.replies.push(...newItems.replies.filter((reply) => !existingIds.has(reply._id)));
        currentCache.currentPage = newItems.currentPage;
        currentCache.hasMore = newItems.hasMore;
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page || currentArg?.commentId !== previousArg?.commentId;
      },
    }),
  }),
});

export const {
  useDeleteCommentMutation,
  useGetAllCommentsQuery,
  useGetRepliesQuery,
  usePostCommentMutation,
} = commentApi;
