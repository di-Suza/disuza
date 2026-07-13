import { api } from '@/shared/api/api';
import { getSocket } from '@/shared/services/socket';
import type {
  CodeExecutionPayload,
  CollabRoomResponse,
  CollabRoomsResponse,
  CollabStatusResponse,
  RoomProblem,
  RoomSyncPayload,
} from '../model/collab.types';

const isRoomSyncPayload = (payload: unknown): payload is RoomSyncPayload => (
  typeof payload === 'object'
  && payload !== null
  && typeof (payload as RoomSyncPayload).type === 'string'
  && typeof (payload as RoomSyncPayload).roomId === 'string'
);

const isCodeExecutionPayload = (payload: unknown): payload is CodeExecutionPayload => (
  typeof payload === 'object'
  && payload !== null
  && typeof (payload as CodeExecutionPayload).status === 'string'
  && typeof (payload as CodeExecutionPayload).roomId === 'string'
);

const getRoomProblem = (value: unknown): RoomProblem | null => (
  typeof value === 'object' && value !== null && typeof (value as RoomProblem)._id === 'string'
    ? value as RoomProblem
    : null
);

export const collabApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCollabStatus: builder.query<CollabStatusResponse, string>({
      query: (conversationId) => `/collab/status/${conversationId}`,
      providesTags: (_result, _error, conversationId) => [{ type: 'CollabStatus', id: conversationId }],
    }),
    sendCollabRequest: builder.mutation<CollabStatusResponse, string>({
      query: (conversationId) => ({
        url: `/collab/request/${conversationId}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, conversationId) => [{ type: 'CollabStatus', id: conversationId }, 'Notifications'],
    }),
    acceptCollabRequest: builder.mutation<{ success: boolean; message: string; data: { _id: string } }, string>({
      query: (conversationId) => ({
        url: `/collab/accept/${conversationId}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, conversationId) => [{ type: 'CollabStatus', id: conversationId }, 'Notifications', 'CollabRooms'],
    }),
    getMyCollabRooms: builder.query<CollabRoomsResponse, void>({
      query: () => '/collab/rooms',
      providesTags: ['CollabRooms'],
    }),
    getPersonalRoom: builder.mutation<{ success: boolean; message: string; data: { _id: string } }, void>({
      query: () => ({
        url: '/collab/personal-room',
        method: 'POST',
      }),
      invalidatesTags: ['CollabRooms'],
    }),
    getCollabRoom: builder.query<CollabRoomResponse, string>({
      query: (roomId) => `/collab/room/${roomId}`,
      providesTags: (_result, _error, roomId) => [{ type: 'CollabRoom', id: roomId }],
      keepUnusedDataFor: 0,
      async onCacheEntryAdded(roomId, { getState, updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        const socket = getSocket();
        const currentUserId = () => (getState() as { auth?: { user?: { _id?: string } } }).auth?.user?._id;

        const handleRoomSync = (payload: unknown) => {
          if (!isRoomSyncPayload(payload) || payload.roomId !== roomId) return;

          updateCachedData((draft) => {
            if (!draft?.data) return;

            if (payload.type === 'ADD_PROBLEM') {
              const roomProblem = getRoomProblem(payload.data?.roomProblem);
              if (!roomProblem) return;

              const alreadyExists = draft.data.problems.some((problem) => problem._id === roomProblem._id);
              if (!alreadyExists) draft.data.problems.unshift(roomProblem);
            }

            if (payload.type === 'SELECT_PROBLEM') {
              const selectedProblem = getRoomProblem(payload.data?.selectedProblem);
              const previousProblem = getRoomProblem(payload.data?.previousProblem);
              if (!selectedProblem) return;

              draft.data.roomDetails.currentlySelectedProblem = selectedProblem;
              draft.data.problems = draft.data.problems.map((problem) => {
                if (problem._id === selectedProblem._id) return selectedProblem;
                if (previousProblem && problem._id === previousProblem._id) return previousProblem;
                return problem;
              });
            }

            if (payload.type === 'UNSELECT_PROBLEM') {
              const unselectedProblem = getRoomProblem(payload.data?.unselectedProblem);
              draft.data.roomDetails.currentlySelectedProblem = null;

              if (unselectedProblem) {
                draft.data.problems = draft.data.problems.map((problem) => (problem._id === unselectedProblem._id ? unselectedProblem : problem));
              }
            }

            if (payload.type === 'CODE_CHANGE' || payload.type === 'YJS_CODE_UPDATE') {
              if ((payload.data?.changedBy as { id?: string; _id?: string } | undefined)?.id === currentUserId()) return;
              const roomProblemId = typeof payload.data?.roomProblemId === 'string' ? payload.data.roomProblemId : null;
              const code = typeof payload.data?.code === 'string' ? payload.data.code : null;
              if (!roomProblemId || code === null) return;

              if (draft.data.roomDetails.currentlySelectedProblem?._id === roomProblemId) {
                draft.data.roomDetails.currentlySelectedProblem.currentCode = code;
              }

              const roomProblem = draft.data.problems.find((problem) => problem._id === roomProblemId);
              if (roomProblem) roomProblem.currentCode = code;
            }

            if (payload.type === 'LANG_CHANGE' || payload.type === 'RUN_COMPLETED') {
              const roomProblem = getRoomProblem(payload.data?.roomProblem);
              if (!roomProblem) return;

              if (draft.data.roomDetails.currentlySelectedProblem?._id === roomProblem._id) {
                draft.data.roomDetails.currentlySelectedProblem = roomProblem;
              }

              draft.data.problems = draft.data.problems.map((problem) => (problem._id === roomProblem._id ? roomProblem : problem));
            }
          });
        };

        const handleCodeExecution = (payload: unknown) => {
          if (!isCodeExecutionPayload(payload) || payload.roomId !== roomId || payload.status !== 'completed' || !payload.roomProblem) return;

          updateCachedData((draft) => {
            if (!draft?.data) return;
            const roomProblem = payload.roomProblem!;

            if (draft.data.roomDetails.currentlySelectedProblem?._id === roomProblem._id) {
              draft.data.roomDetails.currentlySelectedProblem = roomProblem;
            }

            draft.data.problems = draft.data.problems.map((problem) => (problem._id === roomProblem._id ? roomProblem : problem));
          });
        };

        try {
          const { data: cachedData } = await cacheDataLoaded;
          if (cachedData?.data?.roomDetails?.realtimeDisabled) {
            await cacheEntryRemoved;
            return;
          }
          socket.on('room_sync', handleRoomSync);
          socket.on('code_execution', handleCodeExecution);
        } catch {
          // Cache was removed before it loaded.
        }

        await cacheEntryRemoved;
        socket.off('room_sync', handleRoomSync);
        socket.off('code_execution', handleCodeExecution);
      },
    }),
  }),
});

export const {
  useAcceptCollabRequestMutation,
  useGetCollabRoomQuery,
  useGetCollabStatusQuery,
  useGetMyCollabRoomsQuery,
  useGetPersonalRoomMutation,
  useSendCollabRequestMutation,
} = collabApi;
