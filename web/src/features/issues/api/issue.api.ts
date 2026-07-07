import { api } from '@/shared/api/api';
import type { SubmitIssueRequest, SubmitIssueResponse } from '../model/issue.types';

export const issueApi = api.injectEndpoints({
  endpoints: (builder) => ({
    submitIssue: builder.mutation<SubmitIssueResponse, SubmitIssueRequest>({
      query: (body) => ({
        url: '/issue',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Issues'],
    }),
  }),
});

export const { useSubmitIssueMutation } = issueApi;
