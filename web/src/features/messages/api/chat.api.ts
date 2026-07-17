import { api } from '@/shared/api/api';
import { getSocket } from '@/shared/services/socket';
import { setLastReceivedMessage } from '../state/chatSlice';
import type {
  ChatConversation,
  ChatMessage,
  CreateGroupRequest,
  CreateGroupResponse,
  DeleteConversationRequest,
  DeleteConversationResponse,
  GetConversationsResponse,
  GetMessagesQueryArgs,
  GetMessagesResponse,
  MarkAsReadResponse,
  StartConversationRequest,
  StartConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
  UnsendMessageRequest,
  UnsendMessageResponse,
} from '../model/chat.types';

const toIdString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);

  if (value && typeof value === 'object') {
    const record = value as { _id?: unknown; id?: unknown; toString?: () => string };
    const nestedId = record._id || record.id;

    if (typeof nestedId === 'string') return nestedId;
    if (nestedId && typeof nestedId === 'object' && typeof (nestedId as { toString?: () => string }).toString === 'function') {
      return (nestedId as { toString: () => string }).toString();
    }

    if (typeof record.toString === 'function') {
      const stringValue = record.toString();
      if (stringValue && stringValue !== '[object Object]') return stringValue;
    }
  }

  return '';
};

const normalizeChatMessage = (payload: unknown): ChatMessage | null => {
  if (typeof payload !== 'object' || payload === null) return null;

  const message = payload as ChatMessage;
  const messageId = toIdString(message._id);
  const conversationId = toIdString(message.conversationId);
  const sender = toIdString(message.sender);

  if (!messageId || !conversationId || !sender) return null;

  return {
    ...message,
    _id: messageId,
    conversationId,
    sender,
    receiverId: message.receiverId ? toIdString(message.receiverId) : message.receiverId,
    sharedPost: message.sharedPost ? toIdString(message.sharedPost) : message.sharedPost,
  };
};

const normalizeChatConversation = (conversation: ChatConversation): ChatConversation => ({
  ...conversation,
  _id: toIdString(conversation._id),
  roomId: conversation.roomId ? toIdString(conversation.roomId) : conversation.roomId,
  admins: conversation.admins?.map((adminId) => toIdString(adminId)).filter(Boolean),
  otherUser: conversation.otherUser ? { ...conversation.otherUser, _id: toIdString(conversation.otherUser._id) } : conversation.otherUser,
  participants: conversation.participants?.map((participant) => ({
    ...participant,
    _id: toIdString(participant._id),
  })),
  lastMessage: conversation.lastMessage ? {
    ...conversation.lastMessage,
    _id: toIdString(conversation.lastMessage._id),
    sender: toIdString(conversation.lastMessage.sender),
    sharedPost: conversation.lastMessage.sharedPost ? toIdString(conversation.lastMessage.sharedPost) : conversation.lastMessage.sharedPost,
  } : conversation.lastMessage,
});

const removeUnsentMessageFromDraft = (draft: GetMessagesResponse, messageId: string) => {
  draft.messages = draft.messages.filter((message) => message._id !== messageId);
};

const normalizeMessagesForDisplay = (messages: ChatMessage[]) => [...messages]
  .map((message) => normalizeChatMessage(message))
  .filter((message): message is ChatMessage => Boolean(message))
  .reverse();

const applyUnsentConversationUpdate = (draft: GetConversationsResponse, payload: UnsendMessageResponse) => {
  const conversationIndex = draft.conversations.findIndex((conversation) => conversation._id === payload.conversationId);

  if (conversationIndex === -1) return;

  if (payload.wasLastMessage) {
    draft.conversations[conversationIndex].lastMessage = payload.lastMessage || null;
    draft.conversations[conversationIndex].isUnread = false;
    draft.conversations[conversationIndex].updatedAt = payload.updatedAt || payload.lastMessage?.createdAt || new Date().toISOString();
  }
};

const normalizeUnsendPayload = (payload: unknown): UnsendMessageResponse | null => {
  if (typeof payload !== 'object' || payload === null) return null;

  const unsendPayload = payload as UnsendMessageResponse;
  const messageId = toIdString(unsendPayload.messageId);
  const conversationId = toIdString(unsendPayload.conversationId);

  if (!messageId || !conversationId) return null;

  return {
    ...unsendPayload,
    messageId,
    conversationId,
  };
};

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
          const message = normalizeChatMessage(payload);
          if (!message || message.conversationId !== conversationId) return;

          updateCachedData((draft) => {
            const exists = draft.messages.some((draftMessage) => draftMessage._id === message._id);
            if (!exists) draft.messages.push(message);
          });
        };
        const handleMessageUnsent = (payload: unknown) => {
          const unsentMessage = normalizeUnsendPayload(payload);
          if (!unsentMessage || unsentMessage.conversationId !== conversationId) return;

          updateCachedData((draft) => {
            removeUnsentMessageFromDraft(draft, unsentMessage.messageId);
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
      transformResponse: (response: GetConversationsResponse) => ({
        ...response,
        conversations: response.conversations.map(normalizeChatConversation),
      }),
      providesTags: ['Conversations'],
      async onCacheEntryAdded(_arg, { dispatch, getState, updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        const socket = getSocket();
        const handleReceiveMessage = (payload: unknown) => {
          const message = normalizeChatMessage(payload);
          if (!message) return;

          const currentUserId = (getState() as { auth?: { user?: { _id?: string } } }).auth?.user?._id;
          const chatState = (getState() as {
            chat?: {
              isChatWindowActive?: boolean;
              selectedChatId?: string | null;
            };
          }).chat;
          const isActiveConversation = chatState?.isChatWindowActive && chatState.selectedChatId === message.conversationId;
          let conversationWasPresent = false;

          updateCachedData((draft) => {
            const conversationIndex = draft.conversations.findIndex((conversation) => conversation._id === message.conversationId);
            conversationWasPresent = conversationIndex !== -1;

            if (conversationIndex === -1) return;

            draft.conversations[conversationIndex].lastMessage = {
              _id: message._id,
              text: message.text,
              sender: message.sender,
              createdAt: message.createdAt,
              messageType: message.messageType,
              sharedPost: message.sharedPost,
            };
            draft.conversations[conversationIndex].updatedAt = message.createdAt || new Date().toISOString();
            draft.conversations[conversationIndex].isUnread = message.sender !== currentUserId && !isActiveConversation;
            const [updatedConversation] = draft.conversations.splice(conversationIndex, 1);
            draft.conversations.unshift(updatedConversation);
          });

          if (!conversationWasPresent) {
            dispatch(chatApi.util.invalidateTags(['Conversations']));
          }

          if (message.sender !== currentUserId && !isActiveConversation) {
            dispatch(setLastReceivedMessage(message));
          }
        };
        const handleMessageUnsent = (payload: unknown) => {
          const unsentMessage = normalizeUnsendPayload(payload);
          if (!unsentMessage) return;
          updateCachedData((draft) => applyUnsentConversationUpdate(draft, unsentMessage));
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
      async onQueryStarted({ conversationId, message, messageType, sharedPostId }, { dispatch, getState, queryFulfilled }) {
        const tempMessageId = `temp-${Date.now()}`;
        const userId = (getState() as { auth?: { user?: { _id?: string } } }).auth?.user?._id || '';
        const previewText = message.trim() || (messageType === 'post' ? 'Shared a post' : message);
        let messagePatch: { undo: () => void } | undefined;

        if (conversationId) {
          messagePatch = dispatch(
            chatApi.util.updateQueryData('getMessages', { conversationId, page: 1 }, (draft) => {
              const tempMessage: ChatMessage = {
                _id: tempMessageId,
                sender: userId,
                text: previewText,
                conversationId,
                messageType,
                sharedPost: sharedPostId,
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
              text: previewText,
              createdAt: new Date().toISOString(),
              sender: userId,
              messageType,
              sharedPost: sharedPostId,
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
    startConversation: builder.mutation<StartConversationResponse, StartConversationRequest>({
      query: (body) => ({
        url: '/chat/startConversation',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const conversation = normalizeChatConversation(data.conversation);

          dispatch(
            chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
              draft.conversations = draft.conversations.filter((item) => item._id !== conversation._id);
              draft.conversations.unshift(conversation);
            }),
          );
        } catch {
          // Caller surfaces the error.
        }
      },
      invalidatesTags: ['Conversations'],
    }),
    createGroup: builder.mutation<CreateGroupResponse, CreateGroupRequest>({
      query: (body) => ({
        url: '/chat/groups',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const conversation = normalizeChatConversation({
            ...data.conversation,
            roomId: data.conversation.roomId || data.roomId,
          });

          dispatch(
            chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
              draft.conversations = draft.conversations.filter((item) => item._id !== conversation._id);
              draft.conversations.unshift(conversation);
            }),
          );
        } catch {
          // Caller surfaces the error.
        }
      },
      invalidatesTags: ['Conversations', 'CollabRooms'],
    }),
    acceptGroupInvite: builder.mutation<CreateGroupResponse, string>({
      query: (conversationId) => ({
        url: `/chat/groups/${conversationId}/accept`,
        method: 'POST',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const conversation = normalizeChatConversation({
            ...data.conversation,
            roomId: data.conversation.roomId || data.roomId,
          });

          dispatch(
            chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
              draft.conversations = draft.conversations.filter((item) => item._id !== conversation._id);
              draft.conversations.unshift(conversation);
            }),
          );
        } catch {
          // Caller surfaces the error.
        }
      },
      invalidatesTags: ['Conversations', 'Notifications', 'CollabRooms'],
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
  useAcceptGroupInviteMutation,
  useCreateGroupMutation,
  useDeleteConversationMutation,
  useGetConversationsQuery,
  useGetMessagesQuery,
  useMarkAsReadMutation,
  useSendMessageMutation,
  useStartConversationMutation,
  useUnsendMessageMutation,
} = chatApi;
