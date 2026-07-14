import { api } from '@/shared/api/api';
import { getSocket } from '@/shared/services/socket';
import { setLastReceivedMessage } from '../state/chatSlice';
import type {
  ChatMessage,
  DeleteConversationRequest,
  DeleteConversationResponse,
  GetConversationsResponse,
  GetMessagesQueryArgs,
  GetMessagesResponse,
  MarkAsReadResponse,
  SendMessageRequest,
  SendMessageResponse,
  UnsendMessageRequest,
  UnsendMessageResponse,
} from '../model/chat.types';

const removeUnsentMessageFromDraft = (draft: GetMessagesResponse, messageId: string) => {
  draft.messages = draft.messages.filter((message) => message._id !== messageId);
};

const normalizeMessagesForDisplay = (messages: ChatMessage[]) => [...messages].reverse();

const applyUnsentConversationUpdate = (draft: GetConversationsResponse, payload: UnsendMessageResponse) => {
  const conversationIndex = draft.conversations.findIndex((conversation) => conversation._id === payload.conversationId);

  if (conversationIndex === -1) return;

  if (payload.wasLastMessage) {
    draft.conversations[conversationIndex].lastMessage = payload.lastMessage || null;
    draft.conversations[conversationIndex].isUnread = false;
    draft.conversations[conversationIndex].updatedAt = payload.updatedAt || payload.lastMessage?.createdAt || new Date().toISOString();
  }
};

const isChatMessage = (payload: unknown): payload is ChatMessage => (
  typeof payload === 'object'
  && payload !== null
  && typeof (payload as ChatMessage)._id === 'string'
  && typeof (payload as ChatMessage).conversationId === 'string'
);

const isUnsendPayload = (payload: unknown): payload is UnsendMessageResponse => (
  typeof payload === 'object'
  && payload !== null
  && typeof (payload as UnsendMessageResponse).messageId === 'string'
  && typeof (payload as UnsendMessageResponse).conversationId === 'string'
);

export const chatApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMessages: builder.query<GetMessagesResponse, GetMessagesQueryArgs>({
      query: ({ conversationId, page = 1, limit }) => ({
        url: `/chat/getMessages/${conversationId}`,
        params: { page, ...(limit ? { limit } : {}) },
      }),
      transformResponse: (response: GetMessagesResponse) => ({
        ...response,
        messages: normalizeMessagesForDisplay(response.messages),
      }),
      providesTags: (_result, _error, arg) => [
        { type: 'Messages', id: arg.conversationId },
        { type: 'Messages', id: 'LIST' },
      ],
      serializeQueryArgs: ({ queryArgs }) => queryArgs.conversationId,
      merge: (currentCache, newItems, { arg }) => {
        if ((arg.page || 1) === 1) {
          currentCache.messages = newItems.messages;
          currentCache.page = newItems.page;
          currentCache.currentPage = newItems.currentPage;
          currentCache.hasMore = newItems.hasMore;
          currentCache.message = newItems.message;
          currentCache.success = newItems.success;
          return;
        }

        currentCache.messages.unshift(...newItems.messages);
        currentCache.hasMore = newItems.hasMore;
        currentCache.currentPage = newItems.currentPage;
        currentCache.page = newItems.page;
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page || currentArg?.conversationId !== previousArg?.conversationId;
      },
      async onCacheEntryAdded({ conversationId }, { dispatch, updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        const socket = getSocket();
        const handleReceiveMessage = (payload: unknown) => {
          if (!isChatMessage(payload) || payload.conversationId !== conversationId) return;

          updateCachedData((draft) => {
            const exists = draft.messages.some((message) => message._id === payload._id);
            if (!exists) draft.messages.push(payload);
          });
        };
        const handleMessageUnsent = (payload: unknown) => {
          if (!isUnsendPayload(payload) || payload.conversationId !== conversationId) return;

          updateCachedData((draft) => {
            removeUnsentMessageFromDraft(draft, payload.messageId);
          });
        };
        const handleReconnect = () => {
          dispatch(chatApi.util.invalidateTags([{ type: 'Messages', id: conversationId }]));
        };

        try {
          await cacheDataLoaded;
          socket.on('receive-message', handleReceiveMessage);
          socket.on('message-unsent', handleMessageUnsent);
          socket.on('connect', handleReconnect);
          socket.io.on('reconnect', handleReconnect);
        } catch {
          // Cache was removed before it loaded.
        }

        await cacheEntryRemoved;
        socket.off('receive-message', handleReceiveMessage);
        socket.off('message-unsent', handleMessageUnsent);
        socket.off('connect', handleReconnect);
        socket.io.off('reconnect', handleReconnect);
      },
    }),
    getConversations: builder.query<GetConversationsResponse, void>({
      query: () => '/chat/getConversations',
      providesTags: ['Conversations'],
      async onCacheEntryAdded(_arg, { dispatch, getState, updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        const socket = getSocket();
        const handleReceiveMessage = (payload: unknown) => {
          if (!isChatMessage(payload)) return;

          const currentUserId = (getState() as { auth?: { user?: { _id?: string } } }).auth?.user?._id;
          const chatState = (getState() as {
            chat?: {
              isChatWindowActive?: boolean;
              selectedChatId?: string | null;
            };
          }).chat;
          const isActiveConversation = chatState?.isChatWindowActive && chatState.selectedChatId === payload.conversationId;
          let conversationWasPresent = false;

          updateCachedData((draft) => {
            const conversationIndex = draft.conversations.findIndex((conversation) => conversation._id === payload.conversationId);
            conversationWasPresent = conversationIndex !== -1;

            if (conversationIndex === -1) return;

            draft.conversations[conversationIndex].lastMessage = {
              _id: payload._id,
              text: payload.text,
              sender: payload.sender,
              createdAt: payload.createdAt,
            };
            draft.conversations[conversationIndex].updatedAt = payload.createdAt || new Date().toISOString();
            draft.conversations[conversationIndex].isUnread = payload.sender !== currentUserId && !isActiveConversation;
            const [updatedConversation] = draft.conversations.splice(conversationIndex, 1);
            draft.conversations.unshift(updatedConversation);
          });

          if (!conversationWasPresent) {
            dispatch(chatApi.util.invalidateTags(['Conversations']));
          }

          if (payload.sender !== currentUserId && !isActiveConversation) {
            dispatch(setLastReceivedMessage(payload));
          }
        };
        const handleMessageUnsent = (payload: unknown) => {
          if (!isUnsendPayload(payload)) return;
          updateCachedData((draft) => applyUnsentConversationUpdate(draft, payload));
        };
        const handleReconnect = () => {
          dispatch(chatApi.util.invalidateTags(['Conversations']));
        };

        try {
          await cacheDataLoaded;
          socket.on('receive-message', handleReceiveMessage);
          socket.on('message-unsent', handleMessageUnsent);
          socket.on('connect', handleReconnect);
          socket.io.on('reconnect', handleReconnect);
        } catch {
          // Cache was removed before it loaded.
        }

        await cacheEntryRemoved;
        socket.off('receive-message', handleReceiveMessage);
        socket.off('message-unsent', handleMessageUnsent);
        socket.off('connect', handleReconnect);
        socket.io.off('reconnect', handleReconnect);
      },
    }),
    sendMessage: builder.mutation<SendMessageResponse, SendMessageRequest>({
      query: (body) => ({
        url: '/chat/sendMessage',
        method: 'POST',
        body,
      }),
      async onQueryStarted({ conversationId, message }, { dispatch, getState, queryFulfilled }) {
        const tempMessageId = `temp-${Date.now()}`;
        const userId = (getState() as { auth?: { user?: { _id?: string } } }).auth?.user?._id || '';
        let messagePatch: { undo: () => void } | undefined;

        if (conversationId) {
          messagePatch = dispatch(
            chatApi.util.updateQueryData('getMessages', { conversationId, page: 1 }, (draft) => {
              const tempMessage: ChatMessage = {
                _id: tempMessageId,
                sender: userId,
                text: message,
                conversationId,
                createdAt: new Date().toISOString(),
              };
              draft.messages.push(tempMessage);
            }),
          );
        }

        const sidebarPatch = dispatch(
          chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
            const conversationIndex = draft.conversations.findIndex((conversation) => conversation._id === conversationId);

            if (conversationIndex === -1) {
              dispatch(chatApi.util.invalidateTags(['Conversations']));
              return;
            }

            draft.conversations[conversationIndex].isUnread = false;
            draft.conversations[conversationIndex].updatedAt = new Date().toISOString();
            draft.conversations[conversationIndex].lastMessage = {
              _id: tempMessageId,
              text: message,
              createdAt: new Date().toISOString(),
              sender: userId,
            };
            const [updatedConversation] = draft.conversations.splice(conversationIndex, 1);
            draft.conversations.unshift(updatedConversation);
          }),
        );

        try {
          const response = await queryFulfilled;
          const newConversationId = response.data.newMessage.conversationId;

          if (conversationId) {
            dispatch(
              chatApi.util.updateQueryData('getMessages', { conversationId, page: 1 }, (draft) => {
                const tempIndex = draft.messages.findIndex((item) => item._id === tempMessageId);
                if (tempIndex !== -1) {
                  draft.messages[tempIndex] = response.data.newMessage;
                }
              }),
            );
          } else if (newConversationId) {
            dispatch(chatApi.util.invalidateTags(['Conversations', { type: 'Messages', id: newConversationId }]));
          }
        } catch {
          messagePatch?.undo();
          sidebarPatch.undo();
        }
      },
    }),
    markAsRead: builder.mutation<MarkAsReadResponse, string>({
      query: (conversationId) => ({
        url: `/chat/markAsRead/${conversationId}`,
        method: 'PATCH',
      }),
      async onQueryStarted(conversationId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
            const conversation = draft.conversations.find((item) => item._id === conversationId);
            if (conversation) conversation.isUnread = false;
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    unsendMessage: builder.mutation<UnsendMessageResponse, UnsendMessageRequest>({
      query: ({ messageId }) => ({
        url: `/chat/unsendMessage/${messageId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ conversationId, messageId }, { dispatch, queryFulfilled }) {
        const messagePatch = conversationId
          ? dispatch(
            chatApi.util.updateQueryData('getMessages', { conversationId, page: 1 }, (draft) => {
              removeUnsentMessageFromDraft(draft, messageId);
            }),
          )
          : undefined;

        try {
          const { data } = await queryFulfilled;
          dispatch(
            chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
              applyUnsentConversationUpdate(draft, data);
            }),
          );
        } catch {
          messagePatch?.undo();
        }
      },
    }),
    deleteConversation: builder.mutation<DeleteConversationResponse, DeleteConversationRequest>({
      query: ({ conversationId }) => ({
        url: `/chat/deleteConversation/${conversationId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ conversationId }, { dispatch, queryFulfilled }) {
        const conversationsPatch = dispatch(
          chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
            draft.conversations = draft.conversations.filter((conversation) => conversation._id !== conversationId);
          }),
        );

        try {
          await queryFulfilled;
          dispatch(chatApi.util.invalidateTags(['Conversations', { type: 'Messages', id: conversationId }]));
        } catch {
          conversationsPatch.undo();
        }
      },
    }),
  }),
});

export const {
  useDeleteConversationMutation,
  useGetConversationsQuery,
  useGetMessagesQuery,
  useMarkAsReadMutation,
  useSendMessageMutation,
  useUnsendMessageMutation,
} = chatApi;
