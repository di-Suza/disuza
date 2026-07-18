import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type { RootState } from '@/app/store/store';
import env from '@/shared/config/env';

export const baseQuery = fetchBaseQuery({
  baseUrl: env.apiBaseUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    return headers;
  },
});

