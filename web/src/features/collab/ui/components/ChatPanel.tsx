import { MessageSquare, RefreshCw, Send } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import { useGetMessagesQuery, useMarkAsReadMutation, useSendMessageMutation } from '@/features/messages/api/chat.api';
import type { ChatMessage } from '@/features/messages/model/chat.types';
import MessageItem from '@/features/messages/ui/components/MessageItem';
import type { RoomChatPanelProps } from '@/features/collab/model/collab.types';
import { useToast } from '@/shared/hooks/useToast';
import { getSocket } from '@/shared/services/socket';
import Input from '@/shared/ui/Input';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import './ChatPanel.css';

type TypingUser = {
  id: string;
  userName?: string;
};

type TypingPayload = {
  conversationId?: unknown;
  user?: {
    id?: unknown;
    _id?: unknown;
    userName?: string;
  };
};

const TYPING_IDLE_MS = 1800;
const TYPING_REFRESH_MS = 900;
const TYPING_EXPIRE_MS = 3600;

const ChatPanel = ({ conversationId, otherUser, participants = [] }: RoomChatPanelProps) => {
  const { showError } = useToast();
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingIdleTimeoutRef = useRef<number | null>(null);
  const typingExpiryTimeoutsRef = useRef<Map<string, number>>(new Map());
  const lastTypingEmitAtRef = useRef(0);
  const isTypingRef = useRef(false);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const {
    data: chatData,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useGetMessagesQuery(
    { conversationId: conversationId || '', page },
    { skip: !conversationId },
  );
  const allMessages = chatData?.messages || [];
  const hasMoreMessages = Boolean(chatData?.hasMore);
  const [sendMessage] = useSendMessageMutation();
  const [markAsRead] = useMarkAsReadMutation();
  const participantNameById = useMemo(() => new Map(
    participants.map((participant) => [participant._id, participant.userName?.trim() || 'Group member'] as const),
  ), [participants]);
  const shouldShowSenderNames = participants.length > 2;
  const getMessageSenderName = useCallback((item: ChatMessage) => {
    if (!shouldShowSenderNames || item.messageType === 'system') return undefined;

    return item.senderInfo?.userName?.trim()
      || participantNameById.get(item.sender)
      || 'Unknown member';
  }, [participantNameById, shouldShowSenderNames]);
  const clearTypingTimeout = useCallback(() => {
    if (typingIdleTimeoutRef.current) {
      window.clearTimeout(typingIdleTimeoutRef.current);
      typingIdleTimeoutRef.current = null;
    }
  }, []);
  const emitTypingStop = useCallback(() => {
    clearTypingTimeout();
    if (!conversationId || !isTypingRef.current) return;

    getSocket().emit('typing_stop', { conversationId });
    isTypingRef.current = false;
    lastTypingEmitAtRef.current = 0;
  }, [clearTypingTimeout, conversationId]);
  const scheduleTypingStop = useCallback(() => {
    clearTypingTimeout();
    typingIdleTimeoutRef.current = window.setTimeout(() => {
      emitTypingStop();
    }, TYPING_IDLE_MS);
  }, [clearTypingTimeout, emitTypingStop]);
  const emitTypingStart = useCallback(() => {
    if (!conversationId) return;

    const now = Date.now();
    const shouldEmit = !isTypingRef.current || now - lastTypingEmitAtRef.current >= TYPING_REFRESH_MS;

    if (shouldEmit) {
      getSocket().emit('typing_start', { conversationId });
      isTypingRef.current = true;
      lastTypingEmitAtRef.current = now;
    }

    scheduleTypingStop();
  }, [conversationId, scheduleTypingStop]);

  useEffect(() => {
    if (!conversationId) return;
    markAsRead(conversationId).catch(() => undefined);
  }, [conversationId, markAsRead]);

  useEffect(() => {
    if (isLoading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [allMessages.length, conversationId, isLoading]);

  useEffect(() => {
    isTypingRef.current = false;
    lastTypingEmitAtRef.current = 0;
    clearTypingTimeout();
    setTypingUsers([]);

    return () => {
      emitTypingStop();
      typingExpiryTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      typingExpiryTimeoutsRef.current.clear();
    };
  }, [clearTypingTimeout, conversationId, emitTypingStop]);

  useEffect(() => {
    if (!conversationId) return undefined;

    const socket = getSocket();
    const getTypingUserId = (payload: TypingPayload) => (
      typeof payload.user?.id === 'string'
        ? payload.user.id
        : typeof payload.user?._id === 'string'
          ? payload.user._id
          : ''
    );
    const removeTypingUser = (userId: string) => {
      const timeoutId = typingExpiryTimeoutsRef.current.get(userId);
      if (timeoutId) window.clearTimeout(timeoutId);
      typingExpiryTimeoutsRef.current.delete(userId);
      setTypingUsers((current) => current.filter((user) => user.id !== userId));
    };
    const handleTypingStart = (payload: unknown) => {
      const typingPayload = payload as TypingPayload;
      const typingConversationId = typeof typingPayload?.conversationId === 'string' ? typingPayload.conversationId : '';
      const userId = getTypingUserId(typingPayload);

      if (typingConversationId !== conversationId || !userId || userId === currentUserId) return;

      setTypingUsers((current) => {
        const nextUser = {
          id: userId,
          userName: typingPayload.user?.userName || participantNameById.get(userId),
        };

        return current.some((user) => user.id === userId)
          ? current.map((user) => (user.id === userId ? nextUser : user))
          : [...current, nextUser];
      });

      const existingTimeout = typingExpiryTimeoutsRef.current.get(userId);
      if (existingTimeout) window.clearTimeout(existingTimeout);
      typingExpiryTimeoutsRef.current.set(userId, window.setTimeout(() => {
        removeTypingUser(userId);
      }, TYPING_EXPIRE_MS));
    };
    const handleTypingStop = (payload: unknown) => {
      const typingPayload = payload as TypingPayload;
      const typingConversationId = typeof typingPayload?.conversationId === 'string' ? typingPayload.conversationId : '';
      const userId = getTypingUserId(typingPayload);

      if (typingConversationId !== conversationId || !userId) return;
      removeTypingUser(userId);
    };

    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);

    return () => {
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
    };
  }, [conversationId, currentUserId, participantNameById]);

  const handleMessageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextMessage = event.target.value;
    setMessage(nextMessage);

    if (nextMessage.trim()) {
      emitTypingStart();
    } else {
      emitTypingStop();
    }
  }, [emitTypingStart, emitTypingStop]);

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !conversationId) return;

    try {
      await sendMessage({
        conversationId,
        message: trimmedMessage,
        receiverId: otherUser || undefined,
      }).unwrap();
      setMessage('');
      emitTypingStop();
    } catch (apiError) {
      showError(getErrorMessage(apiError, 'Message not sent! Try Again'));
    }
  };
  const typingLabel = typingUsers.length === 0
    ? ''
    : typingUsers.length === 1
      ? `${typingUsers[0].userName || 'Someone'} is typing...`
      : `${typingUsers.length} people are typing...`;

  return (
    <section className="collab-chat-panel">
      <header>
        <MessageSquare size={20} aria-hidden="true" />
        <div className="collab-chat-panel__title">
          <h3>Chat</h3>
          {typingLabel && <p>{typingLabel}</p>}
        </div>
      </header>

      <div className="collab-room-messages">
        {isLoading ? (
          <LoadingSpinner className="collab-modal-state" label="Loading messages" />
        ) : isError ? (
          <div className="collab-modal-state">
            <p>{getErrorMessage(error, 'Messages could not be loaded')}</p>
            <button type="button" onClick={() => refetch()}>
              <RefreshCw size={16} aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : allMessages.length > 0 ? (
          <>
            {hasMoreMessages && (
              <button type="button" className="collab-load-more" disabled={isFetching} onClick={() => setPage((currentPage) => currentPage + 1)}>
                {isFetching ? <LoadingSpinner inline label="Loading messages" size={16} /> : 'Load more messages'}
              </button>
            )}
            {allMessages.map((item, index) => (
              <MessageItem key={`${item._id}_${index}`} message={item} senderName={getMessageSenderName(item)} />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <p className="collab-empty-box">No messages yet</p>
        )}
      </div>

      <footer>
        <Input
          value={message}
          onChange={handleMessageChange}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleSendMessage();
          }}
          placeholder="Type a message..."
        />
        <button type="button" onClick={handleSendMessage} disabled={!message.trim()} aria-label="Send message">
          <Send size={19} aria-hidden="true" />
        </button>
      </footer>
    </section>
  );
};

export default memo(ChatPanel);
