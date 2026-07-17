import { api } from '@/shared/api/api';
import { getSocket } from '@/shared/services/socket';
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
  GroupConversationResponse,
  InviteGroupMembersRequest,
  MarkAsReadResponse,
  PinConversationRequest,
  RemoveGroupMemberRequest,
  StartConversationRequest,
  StartConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
  UnsendMessageRequest,
  UnsendMessageResponse,
  UpdateGroupRequest,
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
    seenBy: message.seenBy?.map((receipt) => ({
      ...receipt,
      user: toIdString(receipt.user),
    })),
    receiverId: message.receiverId ? toIdString(message.receiverId) : message.receiverId,
    sharedPost: message.sharedPost ? toIdString(message.sharedPost) : message.sharedPost,
  };
};

const isSeenPayload = (payload: unknown): payload is { conversationId: string; seenBy: string; seenAt?: string } => (
  typeof payload === 'object'
  && payload !== null
  && Boolean(toIdString((payload as { conversationId?: unknown }).conversationId))
  && Boolean(toIdString((payload as { seenBy?: unknown }).seenBy))
);

const applySeenReceipt = (draft: GetMessagesResponse, payload: { seenBy: string; seenAt?: string }) => {
  draft.messages.forEach((message) => {
    if (message.sender === payload.seenBy) return;
    const exists = message.seenBy?.some((receipt) => receipt.user === payload.seenBy);
    if (exists) return;
    message.seenBy = [
      ...(message.seenBy || []),
      {
        user: payload.seenBy,
        seenAt: payload.seenAt,
      },
    ];
  });
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

const sortConversations = (conversations: ChatConversation[]) => {
  conversations.sort((first, second) => {
    if (Boolean(first.isPinned) !== Boolean(second.isPinned)) return first.isPinned ? -1 : 1;
    return new Date(second.updatedAt || 0).getTime() - new Date(first.updatedAt || 0).getTime();
  });
};

const buildSendMessageBody = (body: SendMessageRequest) => {
  if (!body.attachment) return body;

  const formData = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    if (typeof value === 'undefined' || value === null) return;
    if (key === 'attachment' && value instanceof File) {
      formData.append('attachment', value);
      return;
    }
    formData.append(key, String(value));
  });

  return formData;
};

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
        const handleMessagesSeen = (payload: unknown) => {
          if (!isSeenPayload(payload) || toIdString(payload.conversationId) !== conversationId) return;

          updateCachedData((draft) => {
            applySeenReceipt(draft, {
              seenBy: toIdString(payload.seenBy),
              seenAt: payload.seenAt,
            });
          });
        };
        const handleReconnect = () => {
          dispatch(chatApi.util.invalidateTags([{ type: 'Messages', id: conversationId }]));
        };

        try {
          await cacheDataLoaded;
          socket.off('receive-message', handleReceiveMessage);
          socket.on('receive-message', handleReceiveMessage);
          socket.off('message-unsent', handleMessageUnsent);
          socket.on('message-unsent', handleMessageUnsent);
          socket.off('messages_seen', handleMessagesSeen);
          socket.on('messages_seen', handleMessagesSeen);
          socket.off('connect', handleReconnect);
          socket.on('connect', handleReconnect);
          socket.io.off('reconnect', handleReconnect);
          socket.io.on('reconnect', handleReconnect);
        } catch {
          // Cache was removed before it loaded.
        }

        await cacheEntryRemoved;
        socket.off('receive-message', handleReceiveMessage);
        socket.off('message-unsent', handleMessageUnsent);
        socket.off('messages_seen', handleMessagesSeen);
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
      async onCacheEntryAdded(_arg, { dispatch, updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        const socket = getSocket();
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
          socket.off('message-unsent', handleMessageUnsent);
          socket.on('message-unsent', handleMessageUnsent);
          socket.off('connect', handleReconnect);
          socket.on('connect', handleReconnect);
          socket.io.off('reconnect', handleReconnect);
          socket.io.on('reconnect', handleReconnect);
        } catch {
          // Cache was removed before it loaded.
        }

        await cacheEntryRemoved;
        socket.off('message-unsent', handleMessageUnsent);
        socket.off('connect', handleReconnect);
        socket.io.off('reconnect', handleReconnect);
      },
    }),
    sendMessage: builder.mutation<SendMessageResponse, SendMessageRequest>({
      query: (body) => ({
        url: '/chat/sendMessage',
        method: 'POST',
        body: buildSendMessageBody(body),
      }),
      async onQueryStarted({ conversationId, message, messageType, sharedPostId, attachment }, { dispatch, getState, queryFulfilled }) {
        const tempMessageId = `temp-${Date.now()}`;
        const userId = (getState() as { auth?: { user?: { _id?: string } } }).auth?.user?._id || '';
        const previewText = message.trim() || (attachment ? 'Sent an attachment' : messageType === 'post' ? 'Shared a post' : message);
        let messagePatch: { undo: () => void } | undefined;

        if (conversationId) {
          messagePatch = dispatch(
            chatApi.util.updateQueryData('getMessages', { conversationId, page: 1 }, (draft) => {
              const tempMessage: ChatMessage = {
                _id: tempMessageId,
                sender: userId,
                text: previewText,
                conversationId,
                messageType: attachment ? 'attachment' : messageType,
                sharedPost: sharedPostId,
                attachment: attachment ? {
                  fileId: tempMessageId,
                  name: attachment.name,
                  mime: attachment.type,
                  size: attachment.size,
                  mediaType: attachment.type.startsWith('image/')
                    ? 'image'
                    : attachment.type.startsWith('video/')
                      ? 'video'
                      : attachment.type.startsWith('audio/')
                        ? 'audio'
                        : 'file',
                } : undefined,
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
              messageType: attachment ? 'attachment' : messageType,
              sharedPost: sharedPostId,
              attachment: attachment ? {
                fileId: tempMessageId,
                name: attachment.name,
                mime: attachment.type,
                size: attachment.size,
                mediaType: attachment.type.startsWith('image/')
                  ? 'image'
                  : attachment.type.startsWith('video/')
                    ? 'video'
                    : attachment.type.startsWith('audio/')
                      ? 'audio'
                      : 'file',
              } : undefined,
            };
            const [updatedConversation] = draft.conversations.splice(conversationIndex, 1);
            draft.conversations.unshift(updatedConversation);
            sortConversations(draft.conversations);
          }),
        );

        try {
          const response = await queryFulfilled;
          const newConversationId = response.data.newMessage.conversationId;
          const deliveredMessage = normalizeChatMessage(response.data.newMessage) || response.data.newMessage;

          if (conversationId) {
            dispatch(
              chatApi.util.updateQueryData('getMessages', { conversationId, page: 1 }, (draft) => {
                const tempIndex = draft.messages.findIndex((item) => item._id === tempMessageId);
                if (tempIndex !== -1) {
                  draft.messages[tempIndex] = deliveredMessage;
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
    updateGroup: builder.mutation<GroupConversationResponse, UpdateGroupRequest>({
      query: ({ conversationId, groupName }) => ({
        url: `/chat/groups/${conversationId}`,
        method: 'PATCH',
        body: { groupName },
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (!data.conversation) return;
          const conversation = normalizeChatConversation(data.conversation);

          dispatch(
            chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
              const index = draft.conversations.findIndex((item) => item._id === conversation._id);
              if (index === -1) {
                draft.conversations.unshift(conversation);
                return;
              }
              draft.conversations[index] = { ...draft.conversations[index], ...conversation };
            }),
          );
        } catch {
          // Caller surfaces the error.
        }
      },
      invalidatesTags: ['Conversations', 'CollabRooms'],
    }),
    inviteGroupMembers: builder.mutation<GroupConversationResponse, InviteGroupMembersRequest>({
      query: ({ conversationId, memberIds }) => ({
        url: `/chat/groups/${conversationId}/invite`,
        method: 'POST',
        body: { memberIds },
      }),
      invalidatesTags: ['Conversations', 'Notifications', 'CollabRooms'],
    }),
    removeGroupMember: builder.mutation<GroupConversationResponse, RemoveGroupMemberRequest>({
      query: ({ conversationId, memberId }) => ({
        url: `/chat/groups/${conversationId}/members/${memberId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ conversationId, memberId }, { dispatch, getState, queryFulfilled }) {
        const currentUserId = (getState() as { auth?: { user?: { _id?: string } } }).auth?.user?._id;
        const removeSelf = currentUserId === memberId;
        const patchResult = removeSelf
          ? dispatch(
            chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
              draft.conversations = draft.conversations.filter((conversation) => conversation._id !== conversationId);
            }),
          )
          : undefined;

        try {
          const { data } = await queryFulfilled;
          if (data.conversation) {
            const conversation = normalizeChatConversation(data.conversation);
            dispatch(
              chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
                const index = draft.conversations.findIndex((item) => item._id === conversation._id);
                if (index !== -1) draft.conversations[index] = { ...draft.conversations[index], ...conversation };
              }),
            );
          }
        } catch {
          patchResult?.undo();
        }
      },
      invalidatesTags: ['Conversations', 'CollabRooms'],
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
            if (conversation) {
              conversation.isUnread = false;
              conversation.unreadCount = 0;
            }
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    pinConversation: builder.mutation<GroupConversationResponse, PinConversationRequest>({
      query: ({ conversationId, pinned }) => ({
        url: `/chat/pin/${conversationId}`,
        method: 'PATCH',
        body: { pinned },
      }),
      async onQueryStarted({ conversationId, pinned }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
            const conversation = draft.conversations.find((item) => item._id === conversationId);
            if (conversation) conversation.isPinned = pinned;
            sortConversations(draft.conversations);
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ['Conversations'],
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
  useInviteGroupMembersMutation,
  useMarkAsReadMutation,
  usePinConversationMutation,
  useRemoveGroupMemberMutation,
  useSendMessageMutation,
  useStartConversationMutation,
  useUpdateGroupMutation,
  useUnsendMessageMutation,
} = chatApi;
