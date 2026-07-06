import { api } from '@/shared/api/api';
import type {
  CreatePostResponse,
  DeletePostResponse,
  FeedQueryArgs,
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
  }),
});

export const {
  useCreatePostMutation,
  useDeletePostMutation,
  useGetAllPostsQuery,
  useGetFeedQuery,
  useGetPostQuery,
  useUpdatePostMutation,
} = postApi;
