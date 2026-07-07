import { api } from '@/shared/api/api';
import type { DiscoverQueryArgs, DiscoverResponse, SearchQueryArgs, SearchResponse } from '../model/search.types';

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

export const searchApi = api.injectEndpoints({
  endpoints: (builder) => ({
    search: builder.query<SearchResponse, SearchQueryArgs>({
      query: ({ q, userPage = 1, postPage = 1, limit = 10 }) => `/search?${toQueryString({ q, userPage, postPage, limit })}`,
      providesTags: ['Search'],
    }),
    discover: builder.query<DiscoverResponse, DiscoverQueryArgs | void>({
      query: (args) => `/search/discover?${toQueryString({ page: args?.page || 1, limit: args?.limit || 8 })}`,
      providesTags: ['Search'],
    }),
  }),
});

export const { useDiscoverQuery, useSearchQuery } = searchApi;
