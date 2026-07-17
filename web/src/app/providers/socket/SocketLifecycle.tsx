import { useCallback, useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { clearSession } from '@/features/auth/state/authSlice';
import { chatApi } from '@/features/messages/api/chat.api';
import type { ChatConversation, ChatMessage, GetMessagesResponse } from '@/features/messages/model/chat.types';
import { deleteQueuedChatMessage, getQueuedChatMessages, isRetryableMessageSendError } from '@/features/messages/model/offlineMessageQueue';
import { setLastReceivedMessage } from '@/features/messages/state/chatSlice';
import { notificationApi } from '@/features/notifications/api/notification.api';
import type { NotificationItem } from '@/features/notifications/model/notification.types';
import { api } from '@/shared/api/api';
import { connectSocket, disconnectSocket, getSocket } from '@/shared/services/socket';

const SOCKET_HEARTBEAT_MS = 25_000;

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

const normalizeIncomingMessage = (payload: unknown): ChatMessage | null => {
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
    deliveredTo: message.deliveredTo?.map((userId) => toIdString(userId)).filter(Boolean),
    receiverId: message.receiverId ? toIdString(message.receiverId) : message.receiverId,
    sharedPost: message.sharedPost ? toIdString(message.sharedPost) : message.sharedPost,
  };
};

const normalizeNotification = (payload: unknown): NotificationItem | null => {
  if (typeof payload !== 'object' || payload === null) return null;

  const notification = payload as NotificationItem;
  const notificationId = toIdString(notification._id);
  const senderId = toIdString(notification.sender?._id);

  if (!notificationId || !senderId || typeof notification.type !== 'string') return null;

  return {
    ...notification,
    _id: notificationId,
    recipient: toIdString(notification.recipient),
    sender: {
      ...notification.sender,
      _id: senderId,
    },
  };
};

const normalizeDeleteNotificationPayload = (payload: unknown): { notificationId: string } | null => {
  if (typeof payload !== 'object' || payload === null) return null;

  const notificationId = toIdString((payload as { notificationId?: unknown }).notificationId);
  return notificationId ? { notificationId } : null;
};

const normalizeMessageUnsentPayload = (payload: unknown): {
  conversationId: string;
  lastMessage?: ChatMessage | null;
  messageId: string;
  updatedAt?: string;
  wasLastMessage?: boolean;
} | null => {
  if (typeof payload !== 'object' || payload === null) return null;

  const data = payload as {
    conversationId?: unknown;
    lastMessage?: ChatMessage | null;
    messageId?: unknown;
    updatedAt?: string;
    wasLastMessage?: boolean;
  };
  const conversationId = toIdString(data.conversationId);
  const messageId = toIdString(data.messageId);

  if (!conversationId || !messageId) return null;

  return {
    ...data,
    conversationId,
    lastMessage: data.lastMessage ? normalizeIncomingMessage(data.lastMessage) || data.lastMessage : data.lastMessage,
    messageId,
  };
};

const normalizeSeenPayload = (payload: unknown): { conversationId: string; seenBy: string; seenAt?: string } | null => {
  if (typeof payload !== 'object' || payload === null) return null;

  const data = payload as { conversationId?: unknown; seenBy?: unknown; seenAt?: string };
  const conversationId = toIdString(data.conversationId);
  const seenBy = toIdString(data.seenBy);

  return conversationId && seenBy ? { conversationId, seenBy, seenAt: data.seenAt } : null;
};

const addMessageToDraft = (draft: GetMessagesResponse, message: ChatMessage) => {
  const exists = draft.messages.some((draftMessage) => draftMessage._id === message._id);
  if (!exists) draft.messages.push(message);
};

const removeMessageFromDraft = (draft: GetMessagesResponse, messageId: string) => {
  draft.messages = draft.messages.filter((message) => message._id !== messageId);
};

const applySeenReceiptToDraft = (draft: GetMessagesResponse, payload: { seenBy: string; seenAt?: string }) => {
  draft.messages.forEach((message) => {
    if (message.sender === payload.seenBy) return;
    if (message.seenBy?.some((receipt) => receipt.user === payload.seenBy)) return;

    message.seenBy = [
      ...(message.seenBy || []),
      {
        user: payload.seenBy,
        seenAt: payload.seenAt,
      },
    ];
  });
};

const sortConversations = (conversations: ChatConversation[]) => {
  conversations.sort((first, second) => {
    if (Boolean(first.isPinned) !== Boolean(second.isPinned)) return first.isPinned ? -1 : 1;
    return new Date(second.updatedAt || 0).getTime() - new Date(first.updatedAt || 0).getTime();
  });
};

const SocketLifecycle = () => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');
  const isChatWindowActive = useAppSelector((state) => state.chat.isChatWindowActive);
  const selectedChatId = useAppSelector((state) => state.chat.selectedChatId);
  const hasConnectedRef = useRef(false);
  const isDrainingOutboxRef = useRef(false);
  const chatActivityRef = useRef({
    isChatWindowActive,
    selectedChatId,
  });

  useEffect(() => {
    chatActivityRef.current = {
      isChatWindowActive,
      selectedChatId,
    };
  }, [isChatWindowActive, selectedChatId]);

  const drainQueuedMessages = useCallback(async () => {
    if (!accessToken || !isAuthenticated || isDrainingOutboxRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    isDrainingOutboxRef.current = true;

    try {
      const queuedMessages = await getQueuedChatMessages();

      for (const queuedMessage of queuedMessages) {
        try {
          await dispatch(chatApi.endpoints.sendMessage.initiate(queuedMessage.payload)).unwrap();
          await deleteQueuedChatMessage(queuedMessage.id);
        } catch (error) {
          if (isRetryableMessageSendError(error)) return;
          await deleteQueuedChatMessage(queuedMessage.id);
        }
      }
    } catch {
      // Offline outbox is best-effort; normal realtime sync should keep running.
    } finally {
      isDrainingOutboxRef.current = false;
    }
  }, [accessToken, dispatch, isAuthenticated]);

  useEffect(() => {
    if (!accessToken || !isAuthenticated) {
      hasConnectedRef.current = false;
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket(accessToken);
    const syncRealtimeState = () => {
      dispatch(api.util.invalidateTags(['Conversations', 'Notifications']));
      void drainQueuedMessages();
    };
    const syncAfterInitialConnect = () => {
      if (!hasConnectedRef.current) {
        hasConnectedRef.current = true;
        void drainQueuedMessages();
        return;
      }

      syncRealtimeState();
    };
    const ensureConnected = () => {
      socket.auth = { accessToken };
      if (!socket.connected) {
        socket.connect();
      } else {
        socket.emit('heartbeat');
        void drainQueuedMessages();
      }
    };
    const intervalId = window.setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      } else {
        socket.connect();
      }
    }, SOCKET_HEARTBEAT_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') ensureConnected();
    };

    socket.on('connect', syncAfterInitialConnect);
    socket.io.on('reconnect', syncRealtimeState);
    window.addEventListener('focus', ensureConnected);
    window.addEventListener('online', ensureConnected);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      socket.off('connect', syncAfterInitialConnect);
      socket.io.off('reconnect', syncRealtimeState);
      window.removeEventListener('focus', ensureConnected);
      window.removeEventListener('online', ensureConnected);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accessToken, dispatch, drainQueuedMessages, isAuthenticated]);

  useEffect(() => {
    if (!accessToken || !isAuthenticated || !currentUserId) return undefined;

    const socket = getSocket(accessToken);
    const handleSessionDisconnected = () => {
      dispatch(clearSession());
      dispatch(api.util.resetApiState());
    };
    const handleNewNotification = (payload: unknown) => {
      const notification = normalizeNotification(payload);
      if (!notification) {
        dispatch(notificationApi.util.invalidateTags(['Notifications']));
        return;
      }

      dispatch(
        notificationApi.util.updateQueryData('getNotifications', { page: 1, limit: 10 }, (draft) => {
          const exists = draft.notifications.some((item) => item._id === notification._id);
          if (exists) return;

          draft.notifications.unshift(notification);
          if (!notification.isRead) draft.unreadCount += 1;
        }),
      );
    };
    const handleDeleteNotification = (payload: unknown) => {
      const deletePayload = normalizeDeleteNotificationPayload(payload);
      if (!deletePayload) {
        dispatch(notificationApi.util.invalidateTags(['Notifications']));
        return;
      }

      let removedFromCache = false;
      dispatch(
        notificationApi.util.updateQueryData('getNotifications', { page: 1, limit: 10 }, (draft) => {
          const deletedNotification = draft.notifications.find((item) => item._id === deletePayload.notificationId);
          removedFromCache = Boolean(deletedNotification);
          draft.notifications = draft.notifications.filter((item) => item._id !== deletePayload.notificationId);

          if (deletedNotification && !deletedNotification.isRead) {
            draft.unreadCount = Math.max(0, draft.unreadCount - 1);
          }
        }),
      );

      if (!removedFromCache) {
        dispatch(notificationApi.util.invalidateTags(['Notifications']));
      }
    };
    const handleReceiveMessage = (payload: unknown) => {
      const message = normalizeIncomingMessage(payload);
      if (!message) return;

      const { isChatWindowActive: isActiveWindow, selectedChatId: activeChatId } = chatActivityRef.current;
      const isOwnMessage = message.sender === currentUserId;
      const isActiveConversation = isActiveWindow && activeChatId === message.conversationId;
      let conversationWasPresent = false;

      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
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
            attachment: message.attachment,
          };
          draft.conversations[conversationIndex].updatedAt = message.createdAt || new Date().toISOString();

          if (isOwnMessage || isActiveConversation) {
            draft.conversations[conversationIndex].isUnread = false;
            draft.conversations[conversationIndex].unreadCount = 0;
          } else {
            draft.conversations[conversationIndex].isUnread = true;
            draft.conversations[conversationIndex].unreadCount = Number(draft.conversations[conversationIndex].unreadCount || 0) + 1;
          }

          const [updatedConversation] = draft.conversations.splice(conversationIndex, 1);
          draft.conversations.unshift(updatedConversation);
          sortConversations(draft.conversations);
        }),
      );

      if (activeChatId === message.conversationId) {
        dispatch(
          chatApi.util.updateQueryData('getMessages', { conversationId: message.conversationId, page: 1 }, (draft) => {
            addMessageToDraft(draft, message);
          }),
        );
      }

      if (!conversationWasPresent) {
        dispatch(chatApi.util.invalidateTags(['Conversations']));
      }

      if (!isOwnMessage && !isActiveConversation) {
        dispatch(setLastReceivedMessage(message));
      }
    };
    const handleMessageUnsent = (payload: unknown) => {
      const unsentMessage = normalizeMessageUnsentPayload(payload);
      if (!unsentMessage) return;

      const { selectedChatId: activeChatId } = chatActivityRef.current;
      let conversationWasPresent = false;

      if (activeChatId === unsentMessage.conversationId) {
        dispatch(
          chatApi.util.updateQueryData('getMessages', { conversationId: unsentMessage.conversationId, page: 1 }, (draft) => {
            removeMessageFromDraft(draft, unsentMessage.messageId);
          }),
        );
      }

      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          const conversationIndex = draft.conversations.findIndex((conversation) => conversation._id === unsentMessage.conversationId);
          conversationWasPresent = conversationIndex !== -1;
          if (conversationIndex === -1 || !unsentMessage.wasLastMessage) return;

          draft.conversations[conversationIndex].lastMessage = unsentMessage.lastMessage || null;
          draft.conversations[conversationIndex].isUnread = false;
          draft.conversations[conversationIndex].unreadCount = 0;
          draft.conversations[conversationIndex].updatedAt = unsentMessage.updatedAt
            || unsentMessage.lastMessage?.createdAt
            || new Date().toISOString();
          sortConversations(draft.conversations);
        }),
      );

      if (!conversationWasPresent) {
        dispatch(chatApi.util.invalidateTags(['Conversations']));
      }
    };
    const handleMessagesSeen = (payload: unknown) => {
      const seenPayload = normalizeSeenPayload(payload);
      if (!seenPayload) return;

      const { selectedChatId: activeChatId } = chatActivityRef.current;
      if (activeChatId !== seenPayload.conversationId) return;

      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId: seenPayload.conversationId, page: 1 }, (draft) => {
          applySeenReceiptToDraft(draft, seenPayload);
        }),
      );
    };

    socket.on('session_disconnected', handleSessionDisconnected);
    socket.on('new_notification', handleNewNotification);
    socket.on('delete_notification', handleDeleteNotification);
    socket.off('receive-message', handleReceiveMessage);
    socket.on('receive-message', handleReceiveMessage);
    socket.on('message-unsent', handleMessageUnsent);
    socket.on('messages_seen', handleMessagesSeen);

    return () => {
      socket.off('session_disconnected', handleSessionDisconnected);
      socket.off('new_notification', handleNewNotification);
      socket.off('delete_notification', handleDeleteNotification);
      socket.off('receive-message', handleReceiveMessage);
      socket.off('message-unsent', handleMessageUnsent);
      socket.off('messages_seen', handleMessagesSeen);
    };
  }, [accessToken, currentUserId, dispatch, isAuthenticated]);

  useEffect(() => () => disconnectSocket(), []);

  return null;
};

export default SocketLifecycle;
