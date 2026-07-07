import { api } from '@/shared/api/api';
import type { CreateReportRequest, CreateReportResponse, MyReportsQueryArgs, MyReportsResponse } from '../model/report.types';

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

export const reportApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createReport: builder.mutation<CreateReportResponse, CreateReportRequest>({
      query: (body) => ({
        url: '/report',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Reports'],
    }),
    getMyReports: builder.query<MyReportsResponse, MyReportsQueryArgs | void>({
      query: (args) => `/report/my-reports?${toQueryString({ page: args?.page || 1, limit: args?.limit })}`,
      providesTags: ['Reports'],
    }),
  }),
});

export const { useCreateReportMutation, useGetMyReportsQuery } = reportApi;