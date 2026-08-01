import type { AppDispatch } from '@/app/store/store';
import { api } from '@/shared/api/api';
import type {
  CreatePostResponse,
  DeleteCollectionResponse,
  DeletePostResponse,
  FeedQueryArgs,
  Post,
  PostAnalyticsQueryArgs,
  PostAnalyticsResponse,
  PostLikeResponse,
  PostRepostResponse,
  PostsListResponse,
  PostsQueryArgs,
  RepostListResponse,
  SavePostRequest,
  SavePostResponse,
  SavedCollectionPostsQueryArgs,
  SavedCollectionPostsResponse,
  SavedCollectionResponse,
  SavedCollectionsResponse,
  SinglePostResponse,
  SingleRepostResponse,
  TrackPostLinkClickRequest,
  TrackPostLinkClickResponse,
  UnsavePostResponse,
  UpdatePostResponse,
  UserRepostsQueryArgs,
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
        'SavedCollectionPosts',
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
        'SavedPostsCollections',
        'SavedCollectionPosts',
        'Auth',
        'Reposts',
      ],
    }),
    getPost: builder.query<SinglePostResponse, string>({
      query: (postId) => `/post/getPost/${postId}`,
      providesTags: (_result, _error, postId) => [{ type: 'Post', id: postId }],
    }),
    getPostAnalytics: builder.query<PostAnalyticsResponse, PostAnalyticsQueryArgs>({
      query: ({ limit, page = 1, postId, section = 'likes' }) => `/post/analytics/${postId}?${toQueryString({ page, limit, section })}`,
      providesTags: (_result, _error, { postId }) => [{ type: 'PostAnalytics', id: postId }],
    }),
    trackPostLinkClick: builder.mutation<TrackPostLinkClickResponse, TrackPostLinkClickRequest>({
      query: ({ linkKey, postId }) => ({
        url: `/post/analytics/${postId}/link-click`,
        method: 'POST',
        body: { linkKey },
      }),
      invalidatesTags: (_result, _error, { postId }) => [{ type: 'PostAnalytics', id: postId }],
    }),
    getAllPosts: builder.query<PostsListResponse, PostsQueryArgs | void>({
      query: (args) => `/post/getAllPosts?${toQueryString({ page: args?.page || 1, limit: args?.limit })}`,
      providesTags: ['Posts'],
    }),
    getUserReposts: builder.query<RepostListResponse, UserRepostsQueryArgs>({
      query: ({ userId, page = 1, limit, viewportWidth }) => `/post/reposts/user/${userId}?${toQueryString({ page, limit, viewportWidth })}`,
      providesTags: (_result, _error, { userId }) => [{ type: 'Reposts', id: userId }, 'Reposts'],
    }),
    getRepost: builder.query<SingleRepostResponse, string>({
      query: (repostId) => `/post/reposts/${repostId}`,
      providesTags: (_result, _error, repostId) => [{ type: 'Repost', id: repostId }],
    }),
    getFeed: builder.query<PostsListResponse, FeedQueryArgs | void>({
      query: (args) => `/post/feed?${toQueryString({
        page: args?.page || 1,
        limit: args?.limit,
        type: args?.type || 'all',
        excludePostIds: args?.excludePostIds?.join(','),
      })}`,
      serializeQueryArgs: ({ endpointName, queryArgs }) => `${endpointName}-${queryArgs?.type || 'all'}`,
      merge: (currentCache, incoming, { arg }) => {
        if (!arg?.page || arg.page <= 1) {
          currentCache.posts = incoming.posts;
        } else {
          const existingPostIds = new Set(currentCache.posts.map((post) => post._id));
          currentCache.posts.push(...incoming.posts.filter((post) => !existingPostIds.has(post._id)));
        }

        currentCache.success = incoming.success;
        currentCache.message = incoming.message;
        currentCache.page = incoming.page;
        currentCache.hasMore = incoming.hasMore;
      },
      forceRefetch: ({ currentArg, previousArg }) => (
        currentArg?.page !== previousArg?.page
        || currentArg?.type !== previousArg?.type
        || currentArg?.limit !== previousArg?.limit
        || currentArg?.excludePostIds?.join(',') !== previousArg?.excludePostIds?.join(',')
      ),
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
    repostPost: builder.mutation<PostRepostResponse, string>({
      query: (postId) => ({
        url: `/post/repostPost/${postId}`,
        method: 'POST',
      }),
      async onQueryStarted(postId, { dispatch, getState, queryFulfilled }) {
        const patches = collectPostRepostPatches(dispatch, getState(), postId, true);

        try {
          await queryFulfilled;
          dispatch(api.util.invalidateTags(['Reposts']));
        } catch {
          undoPatches(patches);
        }
      },
    }),
    unrepostPost: builder.mutation<PostRepostResponse, string>({
      query: (postId) => ({
        url: `/post/unrepostPost/${postId}`,
        method: 'DELETE',
      }),
      async onQueryStarted(postId, { dispatch, getState, queryFulfilled }) {
        const patches = collectPostRepostPatches(dispatch, getState(), postId, false);

        try {
          await queryFulfilled;
          dispatch(api.util.invalidateTags(['Reposts']));
        } catch {
          undoPatches(patches);
        }
      },
    }),
    savePost: builder.mutation<SavePostResponse, SavePostRequest>({
      query: (body) => ({
        url: '/post/savePost',
        method: 'POST',
        body,
      }),
      async onQueryStarted({ postId }, { dispatch, getState, queryFulfilled }) {
        const patches = collectPostSavePatches(dispatch, getState(), postId, true);

        try {
          await queryFulfilled;
          dispatch(api.util.invalidateTags(['SavedPostsCollections', 'SavedCollectionPosts', 'ProfileUser']));
        } catch {
          undoPatches(patches);
        }
      },
    }),
    unsavePost: builder.mutation<UnsavePostResponse, string>({
      query: (postId) => ({
        url: `/post/unsavePost/${postId}`,
        method: 'DELETE',
      }),
      async onQueryStarted(postId, { dispatch, getState, queryFulfilled }) {
        const patches = collectPostSavePatches(dispatch, getState(), postId, false);

        try {
          await queryFulfilled;
          dispatch(api.util.invalidateTags(['SavedPostsCollections', 'SavedCollectionPosts', 'ProfileUser']));
        } catch {
          undoPatches(patches);
        }
      },
    }),
    getSavedPostsCollections: builder.query<SavedCollectionsResponse, void>({
      query: () => '/post/getSavedPostsCollections',
      providesTags: ['SavedPostsCollections'],
    }),
    getSavedCollectionPosts: builder.query<SavedCollectionPostsResponse, SavedCollectionPostsQueryArgs>({
      query: ({ collectionId, page = 1, limit }) => `/post/savedCollections/${collectionId}/posts?${toQueryString({ page, limit })}`,
      providesTags: (_result, _error, { collectionId }) => [
        { type: 'SavedCollectionPosts', id: collectionId },
        'SavedCollectionPosts',
      ],
    }),
    createCollection: builder.mutation<SavedCollectionResponse, { name: string }>({
      query: (body) => ({
        url: '/post/createCollection',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            postApi.util.updateQueryData('getSavedPostsCollections', undefined, (draft) => {
              if (!draft?.collections) return;
              draft.collections = draft.collections.map((collection) => ({ ...collection, selected: false }));
              draft.collections.unshift(data.collection);
            }),
          );
        } catch {
          // Caller surfaces the API error.
        }
      },
    }),
    updateCollection: builder.mutation<SavedCollectionResponse, { collectionId: string; name: string }>({
      query: ({ collectionId, name }) => ({
        url: `/post/updateCollection/${collectionId}`,
        method: 'PATCH',
        body: { name },
      }),
      async onQueryStarted({ collectionId }, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const updatedCollection = data.collection;

          dispatch(
            postApi.util.updateQueryData('getSavedPostsCollections', undefined, (draft) => {
              const collection = draft?.collections?.find((item) => item._id === collectionId);
              if (collection) collection.name = updatedCollection.name;
            }),
          );

          getFulfilledQueryEntries(getState(), ['getSavedCollectionPosts']).forEach((entry) => {
            dispatch(
              postApi.util.updateQueryData('getSavedCollectionPosts', entry.originalArgs as SavedCollectionPostsQueryArgs, (draft) => {
                if (draft?.collection?._id === collectionId) {
                  draft.collection.name = updatedCollection.name;
                }
              }),
            );
          });
        } catch {
          // Caller surfaces the API error.
        }
      },
    }),
    deleteCollection: builder.mutation<DeleteCollectionResponse, string>({
      query: (collectionId) => ({
        url: `/post/deleteCollection/${collectionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SavedPostsCollections', 'SavedCollectionPosts', 'Feed', 'Posts', 'ProfileUser'],
    }),
    changeSavedPostCollection: builder.mutation<SavePostResponse, SavePostRequest>({
      query: (body) => ({
        url: '/post/changeSavedPostCollection',
        method: 'PATCH',
        body,
      }),
      async onQueryStarted({ postId }, { dispatch, getState, queryFulfilled }) {
        const patches = collectPostSavePatches(dispatch, getState(), postId, true);

        try {
          await queryFulfilled;
          dispatch(api.util.invalidateTags(['SavedPostsCollections', 'SavedCollectionPosts', 'Feed', 'Posts', 'ProfileUser']));
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

  getFulfilledQueryEntries(state, ['getFeed', 'getAllPosts', 'getSavedCollectionPosts']).forEach((entry) => {
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

    if (entry.endpointName === 'getSavedCollectionPosts') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getSavedCollectionPosts', entry.originalArgs as SavedCollectionPostsQueryArgs, (draft) => {
            updateSavedCollectionPostsLikeState(draft, postId, liked);
          }),
        ),
      );
    }
  });

  return patches;
};

const collectPostSavePatches = (dispatch: AppDispatch, state: unknown, postId: string, saved: boolean): UndoablePatch[] => {
  const patches: UndoablePatch[] = [
    dispatch(
      postApi.util.updateQueryData('getPost', postId, (draft) => {
        updateSinglePostSaveState(draft, postId, saved);
      }),
    ),
  ];

  getFulfilledQueryEntries(state, ['getFeed', 'getAllPosts', 'getSavedCollectionPosts', 'getUserReposts', 'getRepost']).forEach((entry) => {
    if (entry.endpointName === 'getFeed') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getFeed', entry.originalArgs as FeedQueryArgs | void, (draft) => {
            updatePostsListSaveState(draft, postId, saved);
          }),
        ),
      );
    }

    if (entry.endpointName === 'getAllPosts') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getAllPosts', entry.originalArgs as PostsQueryArgs | void, (draft) => {
            updatePostsListSaveState(draft, postId, saved);
          }),
        ),
      );
    }

    if (entry.endpointName === 'getSavedCollectionPosts') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getSavedCollectionPosts', entry.originalArgs as SavedCollectionPostsQueryArgs, (draft) => {
            updateSavedCollectionPostsSaveState(draft, postId, saved);
          }),
        ),
      );
    }

    if (entry.endpointName === 'getUserReposts') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getUserReposts', entry.originalArgs as UserRepostsQueryArgs, (draft) => {
            updateRepostListPostSaveState(draft, postId, saved);
          }),
        ),
      );
    }

    if (entry.endpointName === 'getRepost') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getRepost', entry.originalArgs as string, (draft) => {
            updateSingleRepostPostSaveState(draft, postId, saved);
          }),
        ),
      );
    }
  });

  return patches;
};

const collectPostRepostPatches = (dispatch: AppDispatch, state: unknown, postId: string, reposted: boolean): UndoablePatch[] => {
  const patches: UndoablePatch[] = [
    dispatch(
      postApi.util.updateQueryData('getPost', postId, (draft) => {
        updateSinglePostRepostState(draft, postId, reposted);
      }),
    ),
  ];

  getFulfilledQueryEntries(state, ['getFeed', 'getAllPosts', 'getSavedCollectionPosts', 'getUserReposts', 'getRepost']).forEach((entry) => {
    if (entry.endpointName === 'getFeed') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getFeed', entry.originalArgs as FeedQueryArgs | void, (draft) => {
            updatePostsListRepostState(draft, postId, reposted);
          }),
        ),
      );
    }

    if (entry.endpointName === 'getAllPosts') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getAllPosts', entry.originalArgs as PostsQueryArgs | void, (draft) => {
            updatePostsListRepostState(draft, postId, reposted);
          }),
        ),
      );
    }

    if (entry.endpointName === 'getSavedCollectionPosts') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getSavedCollectionPosts', entry.originalArgs as SavedCollectionPostsQueryArgs, (draft) => {
            updateSavedCollectionPostsRepostState(draft, postId, reposted);
          }),
        ),
      );
    }

    if (entry.endpointName === 'getUserReposts') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getUserReposts', entry.originalArgs as UserRepostsQueryArgs, (draft) => {
            updateRepostListPostState(draft, postId, reposted);
          }),
        ),
      );
    }

    if (entry.endpointName === 'getRepost') {
      patches.push(
        dispatch(
          postApi.util.updateQueryData('getRepost', entry.originalArgs as string, (draft) => {
            updateSingleRepostPostState(draft, postId, reposted);
          }),
        ),
      );
    }
  });

  return patches;
};

const getFulfilledQueryEntries = (state: unknown, endpointNames: string[]): ApiQueryEntry[] => {
  const queries = (state as ApiCacheState).api?.queries;
  if (!queries) return [];

  return Object.values(queries).filter(
    (entry) => entry.status === 'fulfilled' && Boolean(entry.endpointName && endpointNames.includes(entry.endpointName)),
  );
};

const updatePostsListLikeState = (draft: PostsListResponse | undefined, postId: string, liked: boolean) => {
  const post = draft?.posts?.find((item) => item._id === postId);
  updatePostLikeState(post, liked);
};

const updatePostsListSaveState = (draft: PostsListResponse | undefined, postId: string, saved: boolean) => {
  const post = draft?.posts?.find((item) => item._id === postId);
  updatePostSaveState(post, saved);
};

const updatePostsListRepostState = (draft: PostsListResponse | undefined, postId: string, reposted: boolean) => {
  const post = draft?.posts?.find((item) => item._id === postId);
  updatePostRepostState(post, reposted);
};

const updateSinglePostLikeState = (draft: SinglePostResponse | undefined, postId: string, liked: boolean) => {
  if (draft?.post?._id !== postId) return;
  updatePostLikeState(draft.post, liked);
};

const updateSinglePostSaveState = (draft: SinglePostResponse | undefined, postId: string, saved: boolean) => {
  if (draft?.post?._id !== postId) return;
  updatePostSaveState(draft.post, saved);
};

const updateSinglePostRepostState = (draft: SinglePostResponse | undefined, postId: string, reposted: boolean) => {
  if (draft?.post?._id !== postId) return;
  updatePostRepostState(draft.post, reposted);
};

const updateSavedCollectionPostsLikeState = (draft: SavedCollectionPostsResponse | undefined, postId: string, liked: boolean) => {
  const post = draft?.posts?.find((item) => item._id === postId);
  updatePostLikeState(post, liked);
};

const updateSavedCollectionPostsSaveState = (draft: SavedCollectionPostsResponse | undefined, postId: string, saved: boolean) => {
  if (!draft?.posts) return;

  if (saved) {
    const post = draft.posts.find((item) => item._id === postId);
    updatePostSaveState(post, true);
    return;
  }

  const previousLength = draft.posts.length;
  draft.posts = draft.posts.filter((post) => post._id !== postId);

  if (draft.collection?.postsCount !== undefined && draft.posts.length !== previousLength) {
    draft.collection.postsCount = Math.max(0, Number(draft.collection.postsCount || 0) - 1);
  }
};

const updateSavedCollectionPostsRepostState = (draft: SavedCollectionPostsResponse | undefined, postId: string, reposted: boolean) => {
  const post = draft?.posts?.find((item) => item._id === postId);
  updatePostRepostState(post, reposted);
};

const updateRepostListPostState = (draft: RepostListResponse | undefined, postId: string, reposted: boolean) => {
  draft?.reposts?.forEach((repost) => {
    if (repost.post?._id === postId) updatePostRepostState(repost.post, reposted);
  });
};

const updateRepostListPostSaveState = (draft: RepostListResponse | undefined, postId: string, saved: boolean) => {
  draft?.reposts?.forEach((repost) => {
    if (repost.post?._id === postId) updatePostSaveState(repost.post, saved);
  });
};

const updateSingleRepostPostState = (draft: SingleRepostResponse | undefined, postId: string, reposted: boolean) => {
  if (draft?.repost?.post?._id !== postId) return;
  updatePostRepostState(draft.repost.post, reposted);
};

const updateSingleRepostPostSaveState = (draft: SingleRepostResponse | undefined, postId: string, saved: boolean) => {
  if (draft?.repost?.post?._id !== postId) return;
  updatePostSaveState(draft.repost.post, saved);
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

const updatePostSaveState = (post: Post | undefined, saved: boolean) => {
  if (!post) return;
  post.isSaved = saved;
};

const updatePostRepostState = (post: Post | undefined, reposted: boolean) => {
  if (!post) return;

  const currentReposts = Number(post.counts?.reposts || 0);
  const wasReposted = Boolean(post.isReposted);
  const delta = reposted ? (wasReposted ? 0 : 1) : wasReposted ? -1 : 0;

  post.isReposted = reposted;
  post.counts = {
    ...post.counts,
    reposts: Math.max(0, currentReposts + delta),
  };
};

const undoPatches = (patches: UndoablePatch[]) => {
  patches.forEach((patch) => patch.undo());
};

export const {
  useChangeSavedPostCollectionMutation,
  useCreateCollectionMutation,
  useCreatePostMutation,
  useDeleteCollectionMutation,
  useDeletePostMutation,
  useGetAllPostsQuery,
  useGetFeedQuery,
  useGetPostQuery,
  useLazyGetPostAnalyticsQuery,
  useGetRepostQuery,
  useGetSavedCollectionPostsQuery,
  useGetSavedPostsCollectionsQuery,
  useGetUserRepostsQuery,
  useLikePostMutation,
  useRepostPostMutation,
  useSavePostMutation,
  useTrackPostLinkClickMutation,
  useUnlikePostMutation,
  useUnrepostPostMutation,
  useUnsavePostMutation,
  useUpdateCollectionMutation,
  useUpdatePostMutation,
} = postApi;
