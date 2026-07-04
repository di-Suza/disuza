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

const unwrapEnvelope = <T>(response: ApiEnvelope<T>): T => response.data;
const unwrapUser = (response: ApiEnvelope<{ user: AuthUser }>): AuthUser => response.data.user;

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
    sendOtp: builder.mutation<OtpResponse, SendOtpRequest>({
      query: (body) => ({
        url: '/auth/sendOtp',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapEnvelope<OtpResponse>,
    }),
    verifyAndRegister: builder.mutation<AuthPayload, VerifyAndRegisterRequest>({
      query: (body) => ({
        url: '/auth/verifyAndRegister',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapEnvelope<AuthPayload>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // Mutation consumers surface the error in the form.
        }
      },
    }),
    login: builder.mutation<AuthPayload, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapEnvelope<AuthPayload>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
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
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(clearSession());
          dispatch(api.util.resetApiState());
        }
      },
    }),
    googleLogin: builder.mutation<AuthPayload, GoogleLoginRequest>({
      query: (body) => ({
        url: '/auth/google',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapEnvelope<AuthPayload>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
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
    sendOtpForForgotPassword: builder.mutation<OtpResponse, string>({
      query: (email) => ({
        url: '/auth/sendOtpForForgotPassword',
        method: 'POST',
        body: { email },
      }),
      transformResponse: unwrapEnvelope<OtpResponse>,
    }),
    verifyOtpForForgotPassword: builder.mutation<ForgotPasswordTokenResponse, ForgotPasswordOtpRequest>({
      query: (body) => ({
        url: '/auth/verifyOtpForForgotPassword',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapEnvelope<ForgotPasswordTokenResponse>,
    }),
    updateNewPasswordForgotPassword: builder.mutation<AuthUser, UpdateForgotPasswordRequest>({
      query: (body) => ({
        url: '/auth/updateNewPassword_ForgotPassword',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapUser,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data));
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
