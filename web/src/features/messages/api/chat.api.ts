import { api } from '@/shared/api/api';
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

const applyUnsentConversationUpdate = (draft: GetConversationsResponse, payload: UnsendMessageResponse) => {
  const conversationIndex = draft.conversations.findIndex((conversation) => conversation._id === payload.conversationId);

  if (conversationIndex === -1) return;

  if (payload.wasLastMessage) {
    draft.conversations[conversationIndex].lastMessage = payload.lastMessage || null;
    draft.conversations[conversationIndex].isUnread = false;
    draft.conversations[conversationIndex].updatedAt = payload.updatedAt || payload.lastMessage?.createdAt || new Date().toISOString();
  }
};

export const chatApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMessages: builder.query<GetMessagesResponse, GetMessagesQueryArgs>({
      query: ({ conversationId, page = 1, limit }) => ({
        url: `/chat/getMessages/${conversationId}`,
        params: { page, ...(limit ? { limit } : {}) },
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
    }),
    getConversations: builder.query<GetConversationsResponse, void>({
      query: () => '/chat/getConversations',
      providesTags: ['Conversations'],
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
