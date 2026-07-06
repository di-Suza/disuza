import type { AppDispatch } from '@/app/store/store';
import { api } from '@/shared/api/api';
import type {
  CreatePostResponse,
  DeletePostResponse,
  FeedQueryArgs,
  Post,
  PostLikeResponse,
  PostsListResponse,
  PostsQueryArgs,
  SinglePostResponse,
  UpdatePostResponse,
} from '../model/post.types';

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

export const postApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createPost: builder.mutation<CreatePostResponse, FormData>({
      query: (body) => ({
        url: '/post/createPost',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Posts', 'Feed', 'ProfileUser', 'Auth'],
    }),
    updatePost: builder.mutation<UpdatePostResponse, { postId: string; body: FormData }>({
      query: ({ postId, body }) => ({
        url: `/post/updatePost/${postId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { postId }) => [
        { type: 'Post', id: postId },
        'Posts',
        'Feed',
        'ProfileUser',
      ],
    }),
    deletePost: builder.mutation<DeletePostResponse, string>({
      query: (postId) => ({
        url: `/post/deletePost/${postId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, postId) => [
        { type: 'Post', id: postId },
        'Posts',
        'Feed',
        'ProfileUser',
        'Auth',
      ],
    }),
    getPost: builder.query<SinglePostResponse, string>({
      query: (postId) => `/post/getPost/${postId}`,
      providesTags: (_result, _error, postId) => [{ type: 'Post', id: postId }],
    }),
    getAllPosts: builder.query<PostsListResponse, PostsQueryArgs | void>({
      query: (args) => `/post/getAllPosts?${toQueryString({ page: args?.page || 1, limit: args?.limit })}`,
      providesTags: ['Posts'],
    }),
    getFeed: builder.query<PostsListResponse, FeedQueryArgs | void>({
      query: (args) => `/post/feed?${toQueryString({ page: args?.page || 1, limit: args?.limit, type: args?.type || 'all' })}`,
      providesTags: ['Feed'],
    }),
    likePost: builder.mutation<PostLikeResponse, string>({
      query: (postId) => ({
        url: `/post/likePost/${postId}`,
        method: 'POST',
      }),
      async onQueryStarted(postId, { dispatch, getState, queryFulfilled }) {
        const patches = collectPostLikePatches(dispatch, getState(), postId, true);

        try {
          await queryFulfilled;
          dispatch(api.util.invalidateTags(['ProfileUser', 'UserAccountHistory']));
        } catch {
          undoPatches(patches);
        }
      },
    }),
    unlikePost: builder.mutation<PostLikeResponse, string>({
      query: (postId) => ({
        url: `/post/unlikePost/${postId}`,
        method: 'POST',
      }),
      async onQueryStarted(postId, { dispatch, getState, queryFulfilled }) {
        const patches = collectPostLikePatches(dispatch, getState(), postId, false);

        try {
          await queryFulfilled;
          dispatch(api.util.invalidateTags(['ProfileUser', 'UserAccountHistory']));
        } catch {
          undoPatches(patches);
        }
      },
    }),
  }),
});

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

const collectPostLikePatches = (dispatch: AppDispatch, state: unknown, postId: string, liked: boolean): UndoablePatch[] => {
  const patches: UndoablePatch[] = [
    dispatch(
      postApi.util.updateQueryData('getPost', postId, (draft) => {
        updateSinglePostLikeState(draft, postId, liked);
      }),
    ),
  ];

  getFulfilledQueryEntries(state).forEach((entry) => {
    if (entry.endpointName === 'getFeed') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getFeed', entry.originalArgs as FeedQueryArgs | void, (draft) => {
            updatePostsListLikeState(draft, postId, liked);
          }),
        ),
      );
    }

    if (entry.endpointName === 'getAllPosts') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getAllPosts', entry.originalArgs as PostsQueryArgs | void, (draft) => {
            updatePostsListLikeState(draft, postId, liked);
          }),
        ),
      );
    }
  });

  return patches;
};

const getFulfilledQueryEntries = (state: unknown): ApiQueryEntry[] => {
  const queries = (state as ApiCacheState).api?.queries;
  if (!queries) return [];

  return Object.values(queries).filter(
    (entry) => entry.status === 'fulfilled' && (entry.endpointName === 'getFeed' || entry.endpointName === 'getAllPosts'),
  );
};

const updatePostsListLikeState = (draft: PostsListResponse | undefined, postId: string, liked: boolean) => {
  const post = draft?.posts?.find((item) => item._id === postId);
  updatePostLikeState(post, liked);
};

const updateSinglePostLikeState = (draft: SinglePostResponse | undefined, postId: string, liked: boolean) => {
  if (draft?.post?._id !== postId) return;
  updatePostLikeState(draft.post, liked);
};

const updatePostLikeState = (post: Post | undefined, liked: boolean) => {
  if (!post) return;

  const currentLikes = Number(post.counts?.likes || 0);
  const wasLiked = Boolean(post.isLiked);
  const delta = liked ? (wasLiked ? 0 : 1) : wasLiked ? -1 : 0;

  post.isLiked = liked;
  post.counts = {
    ...post.counts,
    likes: Math.max(0, currentLikes + delta),
  };
};

const undoPatches = (patches: UndoablePatch[]) => {
  patches.forEach((patch) => patch.undo());
};

export const {
  useCreatePostMutation,
  useDeletePostMutation,
  useGetAllPostsQuery,
  useGetFeedQuery,
  useGetPostQuery,
  useLikePostMutation,
  useUnlikePostMutation,
  useUpdatePostMutation,
} = postApi;