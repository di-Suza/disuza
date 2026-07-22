import { api } from '@/shared/api/api';
import type {
  ProblemLanguage,
  ProblemMutationResponse,
  ProblemSearchResponse,
  RunProblemResponse,
} from '../model/collab.types';

type GetProblemsArgs = {
  query: string;
  page: number;
  roomId: string;
};

type RoomProblemArgs = {
  roomId: string;
  roomProblemId: string;
};

export const problemApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProblems: builder.query<ProblemSearchResponse, GetProblemsArgs>({
      query: ({ query, page, roomId }) => ({
        url: `/problem/${roomId}`,
        params: { query, page },
      }),
      serializeQueryArgs: ({ queryArgs }) => `${queryArgs.roomId}:${queryArgs.query || 'all'}`,
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) {
          currentCache.data = newItems.data;
          currentCache.hasMore = newItems.hasMore;
          currentCache.message = newItems.message;
          currentCache.success = newItems.success;
          return;
        }

        currentCache.data.push(...newItems.data);
        currentCache.hasMore = newItems.hasMore;
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.query !== previousArg?.query
          || currentArg?.page !== previousArg?.page
          || currentArg?.roomId !== previousArg?.roomId;
      },
      providesTags: (_result, _error, arg) => [{ type: 'Problems', id: `${arg.roomId}:${arg.query}` }],
    }),
    addProblemToRoom: builder.mutation<ProblemMutationResponse, { roomId: string; problemId: string }>({
      query: ({ roomId, problemId }) => ({
        url: '/problem/addProblemToRoom',
        method: 'POST',
        body: { roomId, problemId },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'CollabRoom', id: arg.roomId }],
    }),
    selectProblem: builder.mutation<ProblemMutationResponse, RoomProblemArgs>({
      query: ({ roomId, roomProblemId }) => ({
        url: '/problem/selectProblem',
        method: 'PATCH',
        body: { roomId, roomProblemId },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'CollabRoom', id: arg.roomId }],
    }),
    unselectProblem: builder.mutation<ProblemMutationResponse, { roomId: string }>({
      query: ({ roomId }) => ({
        url: '/problem/unselectProblem',
        method: 'PATCH',
        body: { roomId },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'CollabRoom', id: arg.roomId }],
    }),
    updateProblemLanguage: builder.mutation<ProblemMutationResponse, RoomProblemArgs & { language: ProblemLanguage }>({
      query: ({ roomId, roomProblemId, language }) => ({
        url: '/problem/updateLanguage',
        method: 'PATCH',
        body: { roomId, roomProblemId, language },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'CollabRoom', id: arg.roomId }],
    }),
    runProblem: builder.mutation<RunProblemResponse, RoomProblemArgs & { code: string; language: ProblemLanguage }>({
      query: ({ roomId, roomProblemId, code, language }) => ({
        url: '/problem/run',
        method: 'POST',
        body: { roomId, roomProblemId, code, language },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'CollabRoom', id: arg.roomId }],
    }),
  }),
});

export const {
  useAddProblemToRoomMutation,
  useGetProblemsQuery,
  useRunProblemMutation,
  useSelectProblemMutation,
  useUnselectProblemMutation,
  useUpdateProblemLanguageMutation,
} = problemApi;
