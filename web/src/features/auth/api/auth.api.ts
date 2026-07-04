import { api } from '@/shared/api/api';
import {
  clearSession,
  markUnauthenticated,
  setAccessToken,
  setAuthLoading,
  setCredentials,
  setUser,
} from '../state/authSlice';
import type {
  ApiEnvelope,
  ApiResult,
  AuthPayload,
  AuthUser,
  ForgotPasswordOtpRequest,
  ForgotPasswordTokenResponse,
  GoogleLoginRequest,
  LoginRequest,
  OtpResponse,
  SendOtpRequest,
  UpdateForgotPasswordRequest,
  VerifyAndRegisterRequest,
} from '../model/auth.types';

type RefreshTokenResponse = {
  accessToken: string;
};

type MessageOnlyResponse = {
  success: boolean;
  message: string;
};

const unwrapEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;
const unwrapEnvelopeWithMessage = <T>(response: ApiEnvelope<T>): ApiResult<T> => ({
  ...response.data,
  message: response.message,
});
const unwrapUser = (response: ApiEnvelope<{ user: AuthUser }>): AuthUser => response.data.user;
const unwrapUserWithMessage = (response: ApiEnvelope<{ user: AuthUser }>): ApiResult<{ user: AuthUser }> => ({
  user: response.data.user,
  message: response.message,
});
const unwrapMessage = (response: MessageOnlyResponse): { message: string } => ({ message: response.message });

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    refreshToken: builder.mutation<RefreshTokenResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      transformResponse: unwrapEnvelope<RefreshTokenResponse>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAccessToken(data.accessToken));
        } catch {
          dispatch(clearSession());
        }
      },
    }),
    sendOtp: builder.mutation<ApiResult<OtpResponse>, SendOtpRequest>({
      query: (body) => ({
        url: '/auth/sendOtp',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapEnvelopeWithMessage<OtpResponse>,
    }),
    verifyAndRegister: builder.mutation<ApiResult<AuthPayload>, VerifyAndRegisterRequest>({
      query: (body) => ({
        url: '/auth/verifyAndRegister',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapEnvelopeWithMessage<AuthPayload>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
        } catch {
          // Mutation consumers surface the error in the form.
        }
      },
    }),
    login: builder.mutation<ApiResult<AuthPayload>, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapEnvelopeWithMessage<AuthPayload>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
        } catch {
          // Mutation consumers surface the error in the form.
        }
      },
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      transformResponse: unwrapMessage,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(clearSession());
          dispatch(api.util.resetApiState());
        }
      },
    }),
    logoutAllDevices: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logoutAllDevices',
        method: 'POST',
      }),
      transformResponse: unwrapMessage,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(clearSession());
          dispatch(api.util.resetApiState());
        }
      },
    }),
    googleLogin: builder.mutation<ApiResult<AuthPayload>, GoogleLoginRequest>({
      query: (body) => ({
        url: '/auth/google',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapEnvelopeWithMessage<AuthPayload>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
        } catch {
          // Mutation consumers surface the error in the form.
        }
      },
    }),
    getMe: builder.query<AuthUser, void>({
      query: () => '/auth/me',
      transformResponse: unwrapUser,
      providesTags: ['Auth'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        dispatch(setAuthLoading());
        try {
          const { data } = await queryFulfilled;
          const accessToken = (getState() as unknown as { auth: { accessToken: string | null } }).auth.accessToken;
          dispatch(setUser(data));
          if (!accessToken) {
            dispatch(markUnauthenticated());
          }
        } catch {
          dispatch(markUnauthenticated());
        }
      },
    }),
    sendOtpForForgotPassword: builder.mutation<ApiResult<OtpResponse>, string>({
      query: (email) => ({
        url: '/auth/sendOtpForForgotPassword',
        method: 'POST',
        body: { email },
      }),
      transformResponse: unwrapEnvelopeWithMessage<OtpResponse>,
    }),
    verifyOtpForForgotPassword: builder.mutation<ApiResult<ForgotPasswordTokenResponse>, ForgotPasswordOtpRequest>({
      query: (body) => ({
        url: '/auth/verifyOtpForForgotPassword',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapEnvelopeWithMessage<ForgotPasswordTokenResponse>,
    }),
    updateNewPasswordForgotPassword: builder.mutation<ApiResult<{ user: AuthUser }>, UpdateForgotPasswordRequest>({
      query: (body) => ({
        url: '/auth/updateNewPassword_ForgotPassword',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapUserWithMessage,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clearSession());
          dispatch(api.util.resetApiState());
        } catch {
          // Mutation consumers surface the error in the form.
        }
      },
    }),
  }),
});

export const {
  useGetMeQuery,
  useGoogleLoginMutation,
  useLoginMutation,
  useLogoutAllDevicesMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useSendOtpForForgotPasswordMutation,
  useSendOtpMutation,
  useUpdateNewPasswordForgotPasswordMutation,
  useVerifyAndRegisterMutation,
  useVerifyOtpForForgotPasswordMutation,
} = authApi;
