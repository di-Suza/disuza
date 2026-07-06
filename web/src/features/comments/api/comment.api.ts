import { api } from '@/shared/api/api';
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
];

export const commentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    postComment: builder.mutation<PostCommentResponse, PostCommentRequest>({
      query: (body) => ({
        url: '/comment/postComment',
        method: 'POST',
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const newComment = data.newComment;

          if (arg.parentCommentId) {
            dispatch(
              commentApi.util.updateQueryData('getReplies', { commentId: arg.parentCommentId }, (draft) => {
                if (!draft.replies.some((reply) => reply._id === newComment._id)) {
                  draft.replies.push(newComment);
                }
              }),
            );

            dispatch(
              commentApi.util.updateQueryData('getAllComments', { postId: arg.postId }, (draft) => {
                updateParentReplyCount(draft.allComments, arg.parentCommentId!, 1);
              }),
            );
          } else {
            dispatch(
              commentApi.util.updateQueryData('getAllComments', { postId: arg.postId }, (draft) => {
                if (!draft.allComments.some((comment) => comment._id === newComment._id)) {
                  draft.allComments.unshift(newComment);
                }
              }),
            );
          }

          dispatch(commentApi.util.invalidateTags(postInvalidationTags(arg.postId)));
        } catch {
          // RTK Query exposes the failed mutation to the caller; no local rollback was applied here.
        }
      },
    }),
    deleteComment: builder.mutation<DeleteCommentResponse, DeleteCommentRequest>({
      query: (body) => ({
        url: '/comment/deleteComment',
        method: 'DELETE',
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patches = [];

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

        try {
          await queryFulfilled;
          dispatch(commentApi.util.invalidateTags(postInvalidationTags(arg.postId)));
        } catch {
          patches.forEach((patch) => patch.undo());
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