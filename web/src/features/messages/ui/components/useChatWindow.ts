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
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type UseChatWindowArgs = {
  allMessages: ChatMessage[];
  handleChatSelect: (chat: ChatConversation | null) => void;
  isFetchingMessages: boolean;
  selectedChat: ChatConversation | null;
};

export const useChatWindow = ({ allMessages, handleChatSelect, isFetchingMessages, selectedChat }: UseChatWindowArgs) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showError } = useToast();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const prevMessageCountRef = useRef(0);
  const prevChatIdRef = useRef<string | null>(null);
  const firstMessageIdRef = useRef<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isCollabPermissionModalOpen, setIsCollabPermissionModalOpen] = useState(false);
  const [sendMessage] = useSendMessageMutation();
  const { selectedChatId } = useAppSelector((state) => state.chat);

  const handleBackToChats = useCallback(() => {
    dispatch(clearSelectedChatFromState());
    dispatch(setChatWindowClosed());
    handleChatSelect(null);
  }, [dispatch, handleChatSelect]);

  const handleUserProfileClick = useCallback(() => {
    if (selectedChat?.isGroup) return;
    if (selectedChat?.otherUser?.isDeletedUser) return;
    const profileId = selectedChat?.otherUser?._id;
    if (profileId) navigate(`/profile/${profileId}`);
  }, [navigate, selectedChat?.isGroup, selectedChat?.otherUser?._id, selectedChat?.otherUser?.isDeletedUser]);

  const handleMessageInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(event.target.value);
  }, []);

  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = messageInput.trim();

    if (!trimmedMessage) return;

    if (selectedChat?.otherUser?.isDeletedUser || selectedChat?.isBlocked || selectedChat?.hasBlockedMe) {
      showError('This chat is not available for new messages.');
      return;
    }

    try {
      await sendMessage({
        conversationId: selectedChat?._id,
        message: trimmedMessage,
        receiverId: selectedChat?.isGroup ? undefined : selectedChat?.otherUser?._id,
      }).unwrap();
      setMessageInput('');
    } catch (error) {
      showError(getErrorMessage(error, 'Message not sent! Try Again'));
    }
  }, [messageInput, selectedChat, sendMessage, showError]);

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

  return {
    handleBackToChats,
    handleCollabClick,
    handleMessageInputChange,
    handleMessageInputKeyDown,
    handleSendMessage,
    handleUserProfileClick,
    isCollabPermissionModalOpen,
    messageInput,
    messagesContainerRef,
    setIsCollabPermissionModalOpen,
  };
};
