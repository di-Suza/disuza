import { Mutex } from 'async-mutex';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { clearSession, setAccessToken } from '@/features/auth/state/authSlice';
import { baseQuery } from './baseQuery';

type RefreshResponse = {
  data?: {
    accessToken?: string;
  };
};

const mutex = new Mutex();

const authPassthroughRoutes = [
  '/auth/login',
  '/auth/google',
  '/auth/verifyAndRegister',
  '/auth/sendOtp',
  '/auth/sendOtpForForgotPassword',
  '/auth/verifyOtpForForgotPassword',
  '/auth/updateNewPassword_ForgotPassword',
];

const getUrl = (args: string | FetchArgs): string => (typeof args === 'string' ? args : args.url);

const isAuthPassthroughRoute = (url: string): boolean => authPassthroughRoutes.some((route) => url.includes(route));

const extractAccessToken = (response: unknown): string | null => {
  const refreshResponse = response as RefreshResponse;
  return refreshResponse.data?.accessToken ?? null;
};

export const baseQueryWithAuthGuard: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  await mutex.waitForUnlock();

  let result = await baseQuery(args, api, extraOptions);
  const url = getUrl(args);
  const state = api.getState() as { auth: { isLoggedOut: boolean } };
  const isAuthRoute = isAuthPassthroughRoute(url);

  if (state.auth.isLoggedOut && !isAuthRoute) {
    return result;
  }

  if (!result.error || result.error.status !== 401 || isAuthRoute) {
    return result;
  }

  if (url.includes('/auth/refresh')) {
    api.dispatch(clearSession());
    return result;
  }

  if (!mutex.isLocked()) {
    const release = await mutex.acquire();

    try {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
        },
        api,
        extraOptions,
      );

      const accessToken = extractAccessToken(refreshResult.data);

      if (accessToken) {
        api.dispatch(setAccessToken(accessToken));
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(clearSession());
      }
    } finally {
      release();
    }
  } else {
    await mutex.waitForUnlock();

    const nextState = api.getState() as { auth: { isLoggedOut: boolean } };
    if (!nextState.auth.isLoggedOut) {
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

