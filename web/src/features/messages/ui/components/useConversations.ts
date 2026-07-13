import { useCallback, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { useMarkAsReadMutation } from '@/features/messages/api/chat.api';
import type { ChatConversation } from '@/features/messages/model/chat.types';
import { setChatWindowActive, setSelectedChatInState } from '@/features/messages/state/chatSlice';

type UseConversationsArgs = {
  conversations: ChatConversation[];
  handleChatSelect: (chat: ChatConversation | null) => void;
  selectedChat: ChatConversation | null;
};

export const useConversations = ({ conversations, handleChatSelect, selectedChat }: UseConversationsArgs) => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.user?._id);
  const [markAsRead] = useMarkAsReadMutation();
  const currentChatFromCache = conversations.find((conversation) => conversation._id === selectedChat?._id);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (
        selectedChat?._id
        && !selectedChat.isBlocked
        && !selectedChat.hasBlockedMe
        && currentChatFromCache?.isUnread
        && selectedChat.lastMessage?.sender !== userId
      ) {
        markAsRead(selectedChat._id).catch(() => undefined);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [currentChatFromCache?.isUnread, markAsRead, selectedChat, userId]);

  const handleConversationSelect = useCallback((chat: ChatConversation) => {
    dispatch(setSelectedChatInState(chat._id));
    dispatch(setChatWindowActive());
    handleChatSelect(chat);
  }, [dispatch, handleChatSelect]);

  return {
    handleConversationSelect,
    userId,
  };
};
