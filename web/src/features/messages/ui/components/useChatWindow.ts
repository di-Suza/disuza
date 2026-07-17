import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { useSendMessageMutation } from '@/features/messages/api/chat.api';
import type { ChatConversation, ChatMessage } from '@/features/messages/model/chat.types';
import {
  clearSelectedChatFromState,
  setChatWindowActive,
  setChatWindowClosed,
} from '@/features/messages/state/chatSlice';
import { useToast } from '@/shared/hooks/useToast';
import { getSocket } from '@/shared/services/socket';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type UseChatWindowArgs = {
  allMessages: ChatMessage[];
  handleChatSelect: (chat: ChatConversation | null) => void;
  isFetchingMessages: boolean;
  selectedChat: ChatConversation | null;
};

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

const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const TYPING_IDLE_MS = 1200;
const TYPING_EXPIRE_MS = 2800;

export const useChatWindow = ({ allMessages, handleChatSelect, isFetchingMessages, selectedChat }: UseChatWindowArgs) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showError } = useToast();
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevMessageCountRef = useRef(0);
  const prevChatIdRef = useRef<string | null>(null);
  const firstMessageIdRef = useRef<string | null>(null);
  const typingIdleTimeoutRef = useRef<number | null>(null);
  const typingExpiryTimeoutsRef = useRef<Map<string, number>>(new Map());
  const isTypingRef = useRef(false);
  const [messageInput, setMessageInput] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isCollabPermissionModalOpen, setIsCollabPermissionModalOpen] = useState(false);
  const [sendMessage] = useSendMessageMutation();
  const { selectedChatId } = useAppSelector((state) => state.chat);

  const clearTypingTimeout = useCallback(() => {
    if (typingIdleTimeoutRef.current) {
      window.clearTimeout(typingIdleTimeoutRef.current);
      typingIdleTimeoutRef.current = null;
    }
  }, []);

  const emitTypingStop = useCallback(() => {
    clearTypingTimeout();
    if (!selectedChat?._id || !isTypingRef.current) return;
    getSocket().emit('typing_stop', { conversationId: selectedChat._id });
    isTypingRef.current = false;
  }, [clearTypingTimeout, selectedChat?._id]);

  const scheduleTypingStop = useCallback(() => {
    clearTypingTimeout();
    typingIdleTimeoutRef.current = window.setTimeout(() => {
      emitTypingStop();
    }, TYPING_IDLE_MS);
  }, [clearTypingTimeout, emitTypingStop]);

  const emitTypingStart = useCallback(() => {
    if (!selectedChat?._id || selectedChat.isBlocked || selectedChat.hasBlockedMe || selectedChat.otherUser?.isDeletedUser) return;
    if (!isTypingRef.current) {
      getSocket().emit('typing_start', { conversationId: selectedChat._id });
      isTypingRef.current = true;
    }
    scheduleTypingStop();
  }, [scheduleTypingStop, selectedChat]);

  const handleBackToChats = useCallback(() => {
    emitTypingStop();
    dispatch(clearSelectedChatFromState());
    dispatch(setChatWindowClosed());
    handleChatSelect(null);
  }, [dispatch, emitTypingStop, handleChatSelect]);

  const handleUserProfileClick = useCallback(() => {
    if (selectedChat?.isGroup) return;
    if (selectedChat?.otherUser?.isDeletedUser) return;
    const profileId = selectedChat?.otherUser?._id;
    if (profileId) navigate(`/profile/${profileId}`);
  }, [navigate, selectedChat?.isGroup, selectedChat?.otherUser?._id, selectedChat?.otherUser?.isDeletedUser]);

  const handleMessageInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(event.target.value);
    emitTypingStart();
  }, [emitTypingStart]);

  const handleAttachmentButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAttachmentChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    if (file.size > CHAT_ATTACHMENT_MAX_SIZE_BYTES) {
      showError('Attachment must be 2MB or smaller.');
      event.target.value = '';
      return;
    }

    setSelectedAttachment(file);
    emitTypingStart();
  }, [emitTypingStart, showError]);

  const handleRemoveAttachment = useCallback(() => {
    setSelectedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = messageInput.trim();

    if (!trimmedMessage && !selectedAttachment) return;

    if (selectedChat?.otherUser?.isDeletedUser || selectedChat?.isBlocked || selectedChat?.hasBlockedMe) {
      showError('This chat is not available for new messages.');
      return;
    }

    try {
      await sendMessage({
        conversationId: selectedChat?._id,
        message: trimmedMessage,
        messageType: selectedAttachment ? 'attachment' : undefined,
        attachment: selectedAttachment || undefined,
        receiverId: selectedChat?.isGroup ? undefined : selectedChat?.otherUser?._id,
      }).unwrap();
      setMessageInput('');
      setSelectedAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      emitTypingStop();
    } catch (error) {
      showError(getErrorMessage(error, 'Message not sent! Try Again'));
    }
  }, [emitTypingStop, messageInput, selectedAttachment, selectedChat, sendMessage, showError]);

  const handleMessageInputKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleCollabClick = useCallback(() => {
    if (selectedChat?.isGroup) {
      if (selectedChat.roomId) {
        navigate(`/collab/${selectedChat.roomId}`);
        return;
      }

      showError('Group room is not ready yet.');
      return;
    }

    setIsCollabPermissionModalOpen(true);
  }, [navigate, selectedChat?.isGroup, selectedChat?.roomId, showError]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (prevChatIdRef.current !== selectedChat?._id) {
      prevMessageCountRef.current = 0;
      prevChatIdRef.current = selectedChat?._id || null;
      firstMessageIdRef.current = null;
    }

    const currentMessageCount = allMessages.length;
    const currentFirstMessageId = allMessages[0]?._id || null;
    const isFirstLoad = prevMessageCountRef.current === 0 && currentMessageCount > 0;
    const isNewMessage = currentMessageCount > prevMessageCountRef.current
      && firstMessageIdRef.current === currentFirstMessageId
      && !isFetchingMessages;

    if (isFirstLoad || isNewMessage) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: isFirstLoad ? 'auto' : 'smooth',
      });
    }

    prevMessageCountRef.current = currentMessageCount;
    firstMessageIdRef.current = currentFirstMessageId;
  }, [allMessages, isFetchingMessages, selectedChat?._id]);

  useEffect(() => {
    if (selectedChatId) {
      dispatch(setChatWindowActive());
    }

    return () => {
      dispatch(setChatWindowClosed());
    };
  }, [dispatch, selectedChatId]);

  useEffect(() => {
    isTypingRef.current = false;
    clearTypingTimeout();
    setTypingUsers([]);

    return () => {
      emitTypingStop();
      typingExpiryTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      typingExpiryTimeoutsRef.current.clear();
    };
  }, [clearTypingTimeout, emitTypingStop, selectedChat?._id]);

  useEffect(() => {
    if (!selectedChat?._id) return undefined;

    const socket = getSocket();
    const removeTypingUser = (userId: string) => {
      const timeoutId = typingExpiryTimeoutsRef.current.get(userId);
      if (timeoutId) window.clearTimeout(timeoutId);
      typingExpiryTimeoutsRef.current.delete(userId);
      setTypingUsers((current) => current.filter((user) => user.id !== userId));
    };
    const handleTypingStart = (payload: unknown) => {
      const typingPayload = payload as TypingPayload;
      const conversationId = typeof typingPayload?.conversationId === 'string' ? typingPayload.conversationId : '';
      const userId = typeof typingPayload?.user?.id === 'string'
        ? typingPayload.user.id
        : typeof typingPayload?.user?._id === 'string'
          ? typingPayload.user._id
          : '';

      if (conversationId !== selectedChat._id || !userId || userId === currentUserId) return;

      setTypingUsers((current) => {
        const nextUser = { id: userId, userName: typingPayload.user?.userName };
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
      const conversationId = typeof typingPayload?.conversationId === 'string' ? typingPayload.conversationId : '';
      const userId = typeof typingPayload?.user?.id === 'string'
        ? typingPayload.user.id
        : typeof typingPayload?.user?._id === 'string'
          ? typingPayload.user._id
          : '';

      if (conversationId !== selectedChat._id || !userId) return;
      removeTypingUser(userId);
    };

    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);

    return () => {
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
    };
  }, [currentUserId, selectedChat?._id]);

  const typingLabel = typingUsers.length === 0
    ? ''
    : typingUsers.length === 1
      ? `${typingUsers[0].userName || 'Someone'} is typing...`
      : `${typingUsers.length} people are typing...`;

  return {
    fileInputRef,
    handleAttachmentButtonClick,
    handleAttachmentChange,
    handleBackToChats,
    handleCollabClick,
    handleMessageInputChange,
    handleMessageInputKeyDown,
    handleRemoveAttachment,
    handleSendMessage,
    handleUserProfileClick,
    isCollabPermissionModalOpen,
    messageInput,
    messagesContainerRef,
    selectedAttachment,
    setIsCollabPermissionModalOpen,
    typingLabel,
  };
};
