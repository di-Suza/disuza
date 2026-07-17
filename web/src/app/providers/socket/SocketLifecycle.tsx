import { useCallback, useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { chatApi } from '@/features/messages/api/chat.api';
import type { ChatConversation, ChatMessage } from '@/features/messages/model/chat.types';
import { deleteQueuedChatMessage, getQueuedChatMessages, isRetryableMessageSendError } from '@/features/messages/model/offlineMessageQueue';
import { setLastReceivedMessage } from '@/features/messages/state/chatSlice';
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
    deliveredTo: message.deliveredTo?.map((userId) => toIdString(userId)).filter(Boolean),
  };
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
    const handleReceiveMessage = (payload: unknown) => {
      const message = normalizeIncomingMessage(payload);
      if (!message) return;

      const isOwnMessage = message.sender === currentUserId;
      const isActiveConversation = isChatWindowActive && selectedChatId === message.conversationId;
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

      if (!conversationWasPresent) {
        dispatch(chatApi.util.invalidateTags(['Conversations']));
      }

      if (!isOwnMessage && !isActiveConversation) {
        dispatch(setLastReceivedMessage(message));
      }
    };

    socket.off('receive-message', handleReceiveMessage);
    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [accessToken, currentUserId, dispatch, isAuthenticated, isChatWindowActive, selectedChatId]);

  useEffect(() => () => disconnectSocket(), []);

  return null;
};

export default SocketLifecycle;
