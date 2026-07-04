import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuthGuard } from './baseQueryWithAuth';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuthGuard,
  tagTypes: ['Auth'],
  endpoints: () => ({}),
});

