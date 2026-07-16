import type { AuthUser } from '@/features/auth/model/auth.types';
import { clearSession, setUser } from '@/features/auth/state/authSlice';
import { api } from '@/shared/api/api';
import type {
  ActivityHistoryResponse,
  BlockedUsersResponse,
  BlockUserResponse,
  FollowersResponse,
  FollowingResponse,
  MessageResponse,
  ProfileUserResponse,
  RecommendationsResponse,
  UpdateGeneralInfoRequest,
  UpdateGeneralInfoResponse,
  UpdateIdentityRequest,
  UpdateIdentityResponse,
  UpdatePasswordRequest,
  UpdateProfessionalInfoRequest,
} from '../model/user.types';

type UpdateEnvelope<T> = {
  success: boolean;
  message: string;
  updatedData: T;
};

const getCurrentUser = (getState: () => unknown): AuthUser | null => (
  getState() as { auth: { user: AuthUser | null } }
).auth.user;

const mergeCurrentUser = (currentUser: AuthUser | null, updates: Partial<AuthUser>): AuthUser | null => {
  if (!currentUser) return null;
  return { ...currentUser, ...updates };
};

const updateProfileFollowState = (draft: ProfileUserResponse | undefined, followed: boolean) => {
  const profileUser = draft?.profileUser;
  if (!profileUser) return 0;

  const wasFollowed = Boolean(profileUser.isFollowed);
  const delta = followed ? (wasFollowed ? 0 : 1) : wasFollowed ? -1 : 0;

  profileUser.isFollowed = followed;
  profileUser.followersCount = Math.max(0, Number(profileUser.followersCount || 0) + delta);

  return delta;
};

const getNextCurrentUserFollowState = (currentUser: AuthUser | null, delta: number): AuthUser | null => {
  if (!currentUser || delta === 0) return null;

  const currentFollowingCount = Number(currentUser.followingCount || 0);

  return mergeCurrentUser(currentUser, {
    followingCount: Math.max(0, currentFollowingCount + delta),
  });
};

export const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    updatePassword: builder.mutation<MessageResponse, UpdatePasswordRequest>({
      query: (body) => ({
        url: '/user/updatePassword',
        method: 'POST',
        body,
      }),
    }),
    verifyDeleteAccountPassword: builder.mutation<MessageResponse, { password: string }>({
      query: (body) => ({
        url: '/user/verifyDeleteAccountPassword',
        method: 'POST',
        body,
      }),
    }),
    sendDeleteAccountOtp: builder.mutation<MessageResponse, void>({
      query: () => ({
        url: '/user/sendDeleteAccountOtp',
        method: 'POST',
      }),
    }),
    verifyDeleteAccountOtp: builder.mutation<MessageResponse, { otp: string }>({
      query: (body) => ({
        url: '/user/verifyDeleteAccountOtp',
        method: 'POST',
        body,
      }),
    }),
    deleteAccount: builder.mutation<MessageResponse, void>({
      query: () => ({
        url: '/user/deleteAccount',
        method: 'DELETE',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(api.util.resetApiState());
          dispatch(clearSession());
        } catch {
          // Caller surfaces the API error.
        }
      },
    }),
    updateUserNameAndPP: builder.mutation<UpdateEnvelope<UpdateIdentityResponse>, UpdateIdentityRequest | FormData>({
      query: (body) => ({
        url: '/user/updateUserNameAndPP',
        method: 'PATCH',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const nextUser = mergeCurrentUser(getCurrentUser(getState), data.updatedData);
          if (nextUser) dispatch(setUser(nextUser));
          dispatch(api.util.invalidateTags(['Auth']));
        } catch {
          // Caller surfaces the API error.
        }
      },
    }),
    updateGeneralInfo: builder.mutation<UpdateEnvelope<UpdateGeneralInfoResponse>, UpdateGeneralInfoRequest>({
      query: (body) => ({
        url: '/user/updateGeneralInfo',
        method: 'PATCH',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const nextUser = mergeCurrentUser(getCurrentUser(getState), data.updatedData);
          if (nextUser) dispatch(setUser(nextUser));
          dispatch(api.util.invalidateTags(['Auth']));
        } catch {
          // Caller surfaces the API error.
        }
      },
    }),
    updateProfessionalInfo: builder.mutation<UpdateEnvelope<UpdateProfessionalInfoRequest>, UpdateProfessionalInfoRequest>({
      query: (body) => ({
        url: '/user/updateProfessionalInfo',
        method: 'PATCH',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const nextUser = mergeCurrentUser(getCurrentUser(getState), data.updatedData as Partial<AuthUser>);
          if (nextUser) dispatch(setUser(nextUser));
          dispatch(api.util.invalidateTags(['Auth']));
        } catch {
          // Caller surfaces the API error.
        }
      },
    }),
    getProfileUser: builder.query<ProfileUserResponse, string>({
      query: (id) => `/user/getProfileUser/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ProfileUser', id }],
    }),
    getUserAccountHistory: builder.query<ActivityHistoryResponse, { type: string; page: number }>({
      query: ({ type, page }) => `/user/getUserAccountHistory?type=${type}&page=${page}`,
      providesTags: ['UserAccountHistory'],
    }),
    getBlockedUsers: builder.query<BlockedUsersResponse, { page?: number } | void>({
      query: (arg) => `/user/blockedUsers?page=${arg?.page || 1}`,
      providesTags: ['BlockedUsers'],
    }),
    getUserRecommendations: builder.query<RecommendationsResponse, { limit?: number } | void>({
      query: (arg) => `/user/recommendations?limit=${arg?.limit || 12}`,
      providesTags: ['UserRecommendations'],
    }),
    followUser: builder.mutation<MessageResponse, string>({
      query: (userId) => ({
        url: `/user/followUser/${userId}`,
        method: 'POST',
      }),
      async onQueryStarted(userId, { dispatch, getState, queryFulfilled }) {
        const previousUser = getCurrentUser(getState);
        let followDelta = 0;
        const profilePatch = dispatch(
          userApi.util.updateQueryData('getProfileUser', userId, (draft) => {
            followDelta = updateProfileFollowState(draft, true);
          }),
        );
        const nextUser = getNextCurrentUserFollowState(previousUser, followDelta);

        if (nextUser) dispatch(setUser(nextUser));

        try {
          await queryFulfilled;
        } catch {
          profilePatch.undo();
          if (previousUser) dispatch(setUser(previousUser));
        }
      },
      invalidatesTags: (_result, _error, userId) => [
        { type: 'ProfileUser', id: userId },
        'Followers',
        'Following',
        'UserRecommendations',
        'Auth',
      ],
    }),
    unfollowUser: builder.mutation<MessageResponse, string>({
      query: (userId) => ({
        url: `/user/unfollowUser/${userId}`,
        method: 'DELETE',
      }),
      async onQueryStarted(userId, { dispatch, getState, queryFulfilled }) {
        const previousUser = getCurrentUser(getState);
        let followDelta = 0;
        const profilePatch = dispatch(
          userApi.util.updateQueryData('getProfileUser', userId, (draft) => {
            followDelta = updateProfileFollowState(draft, false);
          }),
        );
        const nextUser = getNextCurrentUserFollowState(previousUser, followDelta);

        if (nextUser) dispatch(setUser(nextUser));

        try {
          await queryFulfilled;
        } catch {
          profilePatch.undo();
          if (previousUser) dispatch(setUser(previousUser));
        }
      },
      invalidatesTags: (_result, _error, userId) => [
        { type: 'ProfileUser', id: userId },
        'Followers',
        'Following',
        'UserRecommendations',
        'Auth',
      ],
    }),
    blockUser: builder.mutation<BlockUserResponse, string>({
      query: (userId) => ({
        url: `/user/blockUser/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, userId) => [
        { type: 'ProfileUser', id: userId },
        'BlockedUsers',
        'Followers',
        'Following',
        'UserRecommendations',
        'Auth',
      ],
    }),
    unblockUser: builder.mutation<MessageResponse, string>({
      query: (userId) => ({
        url: `/user/unblockUser/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, userId) => [
        { type: 'ProfileUser', id: userId },
        'BlockedUsers',
        'UserRecommendations',
      ],
    }),
    getFollowers: builder.query<FollowersResponse, { userId: string; page?: number }>({
      query: ({ userId, page = 1 }) => `/user/getFollowers/${userId}?page=${page}`,
      providesTags: (_result, _error, { userId }) => [{ type: 'Followers', id: userId }],
    }),
    getFollowing: builder.query<FollowingResponse, { userId: string; page?: number }>({
      query: ({ userId, page = 1 }) => `/user/getFollowing/${userId}?page=${page}`,
      providesTags: (_result, _error, { userId }) => [{ type: 'Following', id: userId }],
    }),
  }),
});

export const {
  useBlockUserMutation,
  useDeleteAccountMutation,
  useFollowUserMutation,
  useGetBlockedUsersQuery,
  useGetFollowersQuery,
  useGetFollowingQuery,
  useGetProfileUserQuery,
  useGetUserAccountHistoryQuery,
  useGetUserRecommendationsQuery,
  useSendDeleteAccountOtpMutation,
  useUnblockUserMutation,
  useUnfollowUserMutation,
  useUpdateGeneralInfoMutation,
  useUpdatePasswordMutation,
  useUpdateProfessionalInfoMutation,
  useUpdateUserNameAndPPMutation,
  useVerifyDeleteAccountOtpMutation,
  useVerifyDeleteAccountPasswordMutation,
} = userApi;
