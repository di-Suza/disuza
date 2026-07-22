import { api } from '@/shared/api/api';
import type {
  CollabRoomResponse,
  ProblemLanguage,
  ProblemMutationResponse,
  ProblemSearchResponse,
  RemoveProblemResponse,
  RoomProblem,
  RunProblemResponse,
} from '../model/collab.types';
import { collabApi } from './collab.api';

type GetProblemsArgs = {
  query: string;
  page: number;
  roomId: string;
};

type RoomProblemArgs = {
  roomId: string;
  roomProblemId: string;
};

const updateRoomProblemInDraft = (
  draft: CollabRoomResponse,
  roomProblemId: string,
  update: (problem: RoomProblem) => void,
) => {
  draft.data.problems.forEach((problem) => {
    if (problem._id === roomProblemId) update(problem);
  });

  const selectedProblem = draft.data.roomDetails.currentlySelectedProblem;
  if (selectedProblem?._id === roomProblemId) update(selectedProblem);
};

const replaceRoomProblemInDraft = (draft: CollabRoomResponse, roomProblem: RoomProblem) => {
  if (draft.data.roomDetails.currentlySelectedProblem?._id === roomProblem._id) {
    draft.data.roomDetails.currentlySelectedProblem = roomProblem;
  }

  draft.data.problems = draft.data.problems.map((problem) => (problem._id === roomProblem._id ? roomProblem : problem));
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
      async onQueryStarted({ roomId, roomProblemId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(collabApi.util.updateQueryData('getCollabRoom', roomId, (draft) => {
          const selectedProblem = draft.data.problems.find((problem) => problem._id === roomProblemId);
          if (!selectedProblem || draft.data.problems.some((problem) => problem.executionStatus === 'running')) return;

          const previousProblemId = draft.data.roomDetails.currentlySelectedProblem?._id;
          if (previousProblemId && previousProblemId !== roomProblemId) {
            updateRoomProblemInDraft(draft, previousProblemId, (problem) => {
              if (problem.status === 'solving') problem.status = 'attempted';
            });
          }

          if (selectedProblem.status !== 'solved') selectedProblem.status = 'solving';
          draft.data.roomDetails.currentlySelectedProblem = selectedProblem;
        }));

        try {
          const response = await queryFulfilled;
          const selectedProblem = response.data.data;
          if (selectedProblem) {
            dispatch(collabApi.util.updateQueryData('getCollabRoom', roomId, (draft) => {
              replaceRoomProblemInDraft(draft, selectedProblem);
              draft.data.roomDetails.currentlySelectedProblem = selectedProblem;
            }));
          }
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, arg) => [{ type: 'CollabRoom', id: arg.roomId }],
    }),
    unselectProblem: builder.mutation<ProblemMutationResponse, { roomId: string }>({
      query: ({ roomId }) => ({
        url: '/problem/unselectProblem',
        method: 'PATCH',
        body: { roomId },
      }),
      async onQueryStarted({ roomId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(collabApi.util.updateQueryData('getCollabRoom', roomId, (draft) => {
          if (draft.data.problems.some((problem) => problem.executionStatus === 'running')) return;

          const selectedProblem = draft.data.roomDetails.currentlySelectedProblem;
          if (selectedProblem?.status === 'solving') {
            updateRoomProblemInDraft(draft, selectedProblem._id, (problem) => {
              if (problem.status === 'solving') problem.status = 'attempted';
            });
          }

          draft.data.roomDetails.currentlySelectedProblem = null;
        }));

        try {
          const response = await queryFulfilled;
          const unselectedProblem = response.data.data;
          if (unselectedProblem) {
            dispatch(collabApi.util.updateQueryData('getCollabRoom', roomId, (draft) => {
              replaceRoomProblemInDraft(draft, unselectedProblem);
            }));
          }
        } catch {
          patchResult.undo();
        }
      },
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
      async onQueryStarted({ roomId, roomProblemId, code, language }, { dispatch, queryFulfilled }) {
        const startedAt = new Date().toISOString();

        dispatch(collabApi.util.updateQueryData('getCollabRoom', roomId, (draft) => {
          updateRoomProblemInDraft(draft, roomProblemId, (problem) => {
            problem.currentCode = code;
            problem.language = language;
            problem.executionStatus = 'running';
            problem.executionStartedAt = startedAt;
          });
        }));

        try {
          const response = await queryFulfilled;
          dispatch(collabApi.util.updateQueryData('getCollabRoom', roomId, (draft) => {
            replaceRoomProblemInDraft(draft, response.data.data.roomProblem);
          }));
        } catch {
          dispatch(collabApi.util.updateQueryData('getCollabRoom', roomId, (draft) => {
            updateRoomProblemInDraft(draft, roomProblemId, (problem) => {
              problem.executionStatus = 'idle';
              problem.executionStartedAt = null;
              problem.executionRequestedBy = null;
            });
          }));
        }
      },
      invalidatesTags: (_result, _error, arg) => [{ type: 'CollabRoom', id: arg.roomId }],
    }),
    removeProblemFromRoom: builder.mutation<RemoveProblemResponse, RoomProblemArgs>({
      query: ({ roomId, roomProblemId }) => ({
        url: '/problem/removeProblemFromRoom',
        method: 'DELETE',
        body: { roomId, roomProblemId },
      }),
      async onQueryStarted({ roomId, roomProblemId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(collabApi.util.updateQueryData('getCollabRoom', roomId, (draft) => {
          if (draft.data.problems.some((problem) => problem.executionStatus === 'running')) return;

          draft.data.problems = draft.data.problems.filter((problem) => problem._id !== roomProblemId);
          if (draft.data.roomDetails.currentlySelectedProblem?._id === roomProblemId) {
            draft.data.roomDetails.currentlySelectedProblem = null;
          }
        }));

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, arg) => [{ type: 'CollabRoom', id: arg.roomId }],
    }),
  }),
});

export const {
  useAddProblemToRoomMutation,
  useGetProblemsQuery,
  useRemoveProblemFromRoomMutation,
  useRunProblemMutation,
  useSelectProblemMutation,
  useUnselectProblemMutation,
  useUpdateProblemLanguageMutation,
} = problemApi;
